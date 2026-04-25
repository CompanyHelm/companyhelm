import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import { GithubPullRequestService } from "../../../../../../github/pull_requests/service.ts";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentEnvironmentShellTimeoutError } from "../../../../../environments/providers/shell_interface.ts";
import { GithubClient } from "../../../../../../github/client.ts";
import { AgentGithubInstallationService } from "./installation_service.ts";
import { AgentGithubResultFormatter } from "./result_formatter.ts";

type CreatedPullRequestDetails = {
  databaseId: number;
  number: number;
  state: string;
  title: string;
  url: string;
};

/**
 * Opens one pull request through the GitHub CLI with an installation token injected only into the
 * create command. The tool keeps PR opening on a structured path while `gh_exec` remains
 * available for long-tail GitHub CLI operations.
 */
export class AgentGithubCreatePullRequestTool {
  private static readonly defaultTimeoutSeconds = 120;

  private static readonly parameters = AgentToolParameterSchema.object({
    baseBranch: Type.String({
      description: "Base branch the pull request should target.",
    }),
    body: Type.Optional(Type.String({
      description: "Optional pull request body. Defaults to an empty body.",
    })),
    draft: Type.Optional(Type.Boolean({
      description: "Whether to create the pull request as a draft.",
    })),
    headBranch: Type.String({
      description: "Head branch name to open as the pull request source.",
    }),
    installationId: Type.String({
      description: "GitHub installation id linked to the current company.",
    }),
    repository: Type.String({
      description: "Repository full name in owner/name form.",
    }),
    timeoutSeconds: Type.Optional(Type.Number({
      description: "Optional timeout in seconds for the pull request creation command. Defaults to 120 seconds.",
    })),
    title: Type.String({
      description: "Pull request title.",
    }),
    workingDirectory: Type.Optional(Type.String({
      description: "Optional working directory to run the gh command from.",
    })),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly installationService: AgentGithubInstallationService;
  private readonly pullRequestContext: {
    agentId: string;
    companyId: string;
    sessionId: string;
    transactionProvider: TransactionProviderInterface;
  };
  private readonly pullRequestService: GithubPullRequestService;

  constructor(
    promptScope: AgentEnvironmentPromptScope,
    installationService: AgentGithubInstallationService,
    pullRequestService: GithubPullRequestService = new GithubPullRequestService(),
    pullRequestContext: {
      agentId: string;
      companyId: string;
      sessionId: string;
      transactionProvider: TransactionProviderInterface;
    } = {
      agentId: "",
      companyId: "",
      sessionId: "",
      transactionProvider: {
        async transaction<T>(): Promise<T> {
          throw new Error("Transaction provider is required to track GitHub pull requests.");
        },
      },
    },
  ) {
    this.promptScope = promptScope;
    this.installationService = installationService;
    this.pullRequestService = pullRequestService;
    this.pullRequestContext = pullRequestContext;
  }

  createDefinition(): ToolDefinition<typeof AgentGithubCreatePullRequestTool.parameters> {
    return {
      description: "Create a GitHub pull request with a linked installation token without interactive gh auth prompts.",
      execute: async (_toolCallId, params) => {
        const repository = AgentGithubCreatePullRequestTool.normalizeRepository(params.repository);
        const baseBranch = AgentGithubCreatePullRequestTool.normalizeBranch(params.baseBranch, "baseBranch");
        const headBranch = AgentGithubCreatePullRequestTool.normalizeBranch(params.headBranch, "headBranch");
        const title = AgentGithubCreatePullRequestTool.normalizeRequiredText(params.title, "title");
        const body = params.body ?? "";
        const draft = params.draft ?? false;
        const token = await this.installationService.getInstallationAccessToken(params.installationId);
        const environment = await this.promptScope.getEnvironment();
        const timeoutSeconds = params.timeoutSeconds ?? AgentGithubCreatePullRequestTool.defaultTimeoutSeconds;
        let result;
        try {
          result = await environment.executeBashCommand({
            command: AgentGithubCreatePullRequestTool.buildShellCommand({
              baseBranch,
              body,
              draft,
              headBranch,
              repository,
              title,
            }),
            environment: {
              GH_PROMPT_DISABLED: "1",
              GH_TOKEN: token,
            },
            timeoutSeconds,
            workingDirectory: params.workingDirectory,
          });
        } catch (error) {
          if (error instanceof AgentEnvironmentShellTimeoutError) {
            throw new Error(`create_github_pull_request timed out after ${timeoutSeconds} seconds.`, {
              cause: error,
            });
          }
          throw error;
        }

        const installationId = GithubClient.validateInstallationId(params.installationId);
        const pullRequestUrl = AgentGithubCreatePullRequestTool.extractPullRequestUrl(result.output);
        const createdPullRequestDetails = pullRequestUrl
          ? await this.loadCreatedPullRequestDetails({
            pullRequestUrl,
            repository,
            timeoutSeconds,
            token,
            workingDirectory: params.workingDirectory,
          })
          : null;
        const trackedPullRequest = createdPullRequestDetails
          ? await this.pullRequestService.trackCreatedPullRequest(
            this.pullRequestContext.transactionProvider,
            {
              companyId: this.pullRequestContext.companyId,
              createdByAgentId: this.pullRequestContext.agentId,
              createdBySessionId: this.pullRequestContext.sessionId,
              externalId: String(createdPullRequestDetails.databaseId),
              installationId,
              number: createdPullRequestDetails.number,
              ownerSessionId: this.pullRequestContext.sessionId,
              repositoryFullName: repository,
              state: this.pullRequestService.normalizeGithubState(createdPullRequestDetails.state),
              title: createdPullRequestDetails.title,
              url: createdPullRequestDetails.url,
            },
          )
          : null;

        return {
          content: [{
            text: AgentGithubResultFormatter.formatDirectShellResult(result),
            type: "text",
          }],
          details: {
            baseBranch,
            command: AgentGithubCreatePullRequestTool.buildDisplayCommand({
              baseBranch,
              body,
              draft,
              headBranch,
              repository,
              title,
            }),
            cwd: params.workingDirectory ?? null,
            exitCode: result.exitCode,
            headBranch,
            installationId,
            pullRequestNumber: createdPullRequestDetails?.number ?? null,
            pullRequestTrackingId: trackedPullRequest?.id ?? null,
            pullRequestUrl,
            repository,
            timeoutSeconds,
            title,
          },
        };
      },
      label: "create_github_pull_request",
      name: "create_github_pull_request",
      parameters: AgentGithubCreatePullRequestTool.parameters,
      promptGuidelines: [
        "Use create_github_pull_request after push_github_branch for the standard PR-opening step.",
        "Call list_github_installations first if you do not already know the installation id to target.",
        "Pass repository, baseBranch, and headBranch explicitly instead of relying on interactive gh prompts.",
        "Use gh_exec only when you need GitHub CLI behavior that create_github_pull_request does not expose.",
      ],
      promptSnippet: "Create a GitHub pull request with a linked installation token",
    };
  }

  private async loadCreatedPullRequestDetails(input: {
    pullRequestUrl: string;
    repository: string;
    timeoutSeconds: number;
    token: string;
    workingDirectory?: string;
  }): Promise<CreatedPullRequestDetails> {
    const environment = await this.promptScope.getEnvironment();
    const result = await environment.executeBashCommand({
      command: AgentGithubCreatePullRequestTool.buildViewPullRequestCommand(input.repository, input.pullRequestUrl),
      environment: {
        GH_PROMPT_DISABLED: "1",
        GH_TOKEN: input.token,
      },
      timeoutSeconds: input.timeoutSeconds,
      workingDirectory: input.workingDirectory,
    });

    return AgentGithubCreatePullRequestTool.parsePullRequestDetails(result.output);
  }

  private static normalizeRepository(repository: string): string {
    const normalizedRepository = repository.trim();
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(normalizedRepository)) {
      throw new Error("repository must be in owner/name form.");
    }

    return normalizedRepository;
  }

  private static normalizeBranch(branch: string, label: string): string {
    const normalizedBranch = branch.trim();
    if (!normalizedBranch) {
      throw new Error(`${label} is required.`);
    }
    if (/\s/u.test(normalizedBranch) || AgentGithubCreatePullRequestTool.hasControlCharacters(normalizedBranch)) {
      throw new Error(`${label} must not contain whitespace or control characters.`);
    }

    return normalizedBranch;
  }

  private static hasControlCharacters(value: string): boolean {
    return [...value].some((character) => {
      const characterCode = character.charCodeAt(0);
      return characterCode < 32 || characterCode === 127;
    });
  }

  private static normalizeRequiredText(value: string, label: string): string {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
  }

  private static buildDisplayCommand(input: {
    baseBranch: string;
    body: string;
    draft: boolean;
    headBranch: string;
    repository: string;
    title: string;
  }): string {
    const args = [
      "pr",
      "create",
      "--repo",
      input.repository,
      "--base",
      input.baseBranch,
      "--head",
      input.headBranch,
      "--title",
      input.title,
      "--body",
      input.body,
    ];
    if (input.draft) {
      args.push("--draft");
    }

    return `gh ${args.map((argument) => {
      return AgentGithubCreatePullRequestTool.shellQuote(argument);
    }).join(" ")}`;
  }

  private static buildShellCommand(input: {
    baseBranch: string;
    body: string;
    draft: boolean;
    headBranch: string;
    repository: string;
    title: string;
  }): string {
    const ghCommand = AgentGithubCreatePullRequestTool.buildDisplayCommand(input);
    return [
      "command -v gh >/dev/null 2>&1 || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y gh)",
      ghCommand,
    ].join("; ");
  }

  private static buildViewPullRequestCommand(repository: string, pullRequestUrl: string): string {
    return [
      "gh",
      "pr",
      "view",
      "--repo",
      repository,
      pullRequestUrl,
      "--json",
      "databaseId,number,state,title,url",
      "--jq",
      ". | @json",
    ].map((argument) => AgentGithubCreatePullRequestTool.shellQuote(argument)).join(" ");
  }

  private static extractPullRequestUrl(output: string): string | null {
    const match = output.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+/u);
    return match?.[0] ?? null;
  }

  private static parsePullRequestDetails(output: string): CreatedPullRequestDetails {
    const parsedOutput = JSON.parse(output.trim()) as unknown;
    if (!parsedOutput || typeof parsedOutput !== "object" || Array.isArray(parsedOutput)) {
      throw new Error("GitHub pull request details response must be an object.");
    }

    const payload = parsedOutput as Record<string, unknown>;
    return {
      databaseId: AgentGithubCreatePullRequestTool.readPositiveInteger(payload.databaseId, "databaseId"),
      number: AgentGithubCreatePullRequestTool.readPositiveInteger(payload.number, "number"),
      state: AgentGithubCreatePullRequestTool.readRequiredString(payload.state, "state"),
      title: AgentGithubCreatePullRequestTool.readRequiredString(payload.title, "title"),
      url: AgentGithubCreatePullRequestTool.readRequiredString(payload.url, "url"),
    };
  }

  private static readPositiveInteger(value: unknown, label: string): number {
    const numericValue = Number(value);
    if (!Number.isSafeInteger(numericValue) || numericValue <= 0) {
      throw new Error(`GitHub pull request ${label} must be a positive integer.`);
    }

    return numericValue;
  }

  private static readRequiredString(value: unknown, label: string): string {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`GitHub pull request ${label} is required.`);
    }

    return value;
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `"'"'`)}'`;
  }
}
