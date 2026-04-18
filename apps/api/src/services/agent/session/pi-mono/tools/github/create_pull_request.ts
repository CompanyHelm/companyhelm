import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentEnvironmentShellTimeoutError } from "../../../../../environments/providers/shell_interface.ts";
import { GithubClient } from "../../../../../../github/client.ts";
import { AgentGithubInstallationService } from "./installation_service.ts";
import { AgentGithubResultFormatter } from "./result_formatter.ts";

/**
 * Opens one pull request through the GitHub CLI with an installation token injected only into the
 * create command. The tool keeps routine PR opening on a structured path while `gh_exec` remains
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

  constructor(
    promptScope: AgentEnvironmentPromptScope,
    installationService: AgentGithubInstallationService,
  ) {
    this.promptScope = promptScope;
    this.installationService = installationService;
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

        const pullRequestUrl = AgentGithubCreatePullRequestTool.extractPullRequestUrl(result.output);

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
            installationId: GithubClient.validateInstallationId(params.installationId),
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

  private static extractPullRequestUrl(output: string): string | null {
    const match = output.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+/u);
    return match?.[0] ?? null;
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `"'"'`)}'`;
  }
}
