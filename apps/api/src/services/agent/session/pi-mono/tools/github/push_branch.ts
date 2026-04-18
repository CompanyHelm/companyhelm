import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentEnvironmentShellTimeoutError } from "../../../../../environments/providers/shell_interface.ts";
import { GithubClient } from "../../../../../../github/client.ts";
import { AgentGithubInstallationService } from "./installation_service.ts";
import { AgentGithubResultFormatter } from "./result_formatter.ts";

/**
 * Pushes one local branch to GitHub with a fresh installation token injected only into the single
 * push command. This keeps routine branch publication on the standard git path without persisting
 * credentials into the repository config or remote URL.
 */
export class AgentGithubPushBranchTool {
  private static readonly defaultTimeoutSeconds = 120;

  private static readonly parameters = AgentToolParameterSchema.object({
    branch: Type.String({
      description: "Local branch name to push to the matching remote branch name.",
    }),
    installationId: Type.String({
      description: "GitHub installation id linked to the current company.",
    }),
    repository: Type.String({
      description: "Repository full name in owner/name form.",
    }),
    timeoutSeconds: Type.Optional(Type.Number({
      description: "Optional timeout in seconds for the push command. Defaults to 120 seconds.",
    })),
    workingDirectory: Type.String({
      description: "Repository working directory that contains the local branch to push.",
    }),
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

  createDefinition(): ToolDefinition<typeof AgentGithubPushBranchTool.parameters> {
    return {
      description: "Push a local Git branch to GitHub from the leased environment using a linked installation token.",
      execute: async (_toolCallId, params) => {
        const repository = AgentGithubPushBranchTool.normalizeRepository(params.repository);
        const branch = AgentGithubPushBranchTool.normalizeBranch(params.branch);
        const token = await this.installationService.getInstallationAccessToken(params.installationId);
        const environment = await this.promptScope.getEnvironment();
        const timeoutSeconds = params.timeoutSeconds ?? AgentGithubPushBranchTool.defaultTimeoutSeconds;
        let result;
        try {
          result = await environment.executeBashCommand({
            command: AgentGithubPushBranchTool.buildShellCommand(repository, branch),
            environment: {
              GH_PROMPT_DISABLED: "1",
              GITHUB_INSTALLATION_TOKEN: token,
              GIT_TERMINAL_PROMPT: "0",
            },
            timeoutSeconds,
            workingDirectory: params.workingDirectory,
          });
        } catch (error) {
          if (error instanceof AgentEnvironmentShellTimeoutError) {
            throw new Error(`push_github_branch timed out after ${timeoutSeconds} seconds.`, {
              cause: error,
            });
          }
          throw error;
        }

        return {
          content: [{
            text: AgentGithubResultFormatter.formatDirectShellResult(result),
            type: "text",
          }],
          details: {
            branch,
            command: AgentGithubPushBranchTool.buildDisplayCommand(repository, branch),
            cwd: params.workingDirectory,
            exitCode: result.exitCode,
            installationId: GithubClient.validateInstallationId(params.installationId),
            repository,
            timeoutSeconds,
          },
        };
      },
      label: "push_github_branch",
      name: "push_github_branch",
      parameters: AgentGithubPushBranchTool.parameters,
      promptGuidelines: [
        "Use push_github_branch for the standard local branch publish step after git commit.",
        "Call list_github_installations first if you do not already know the installation id to target.",
        "Pass repository in owner/name form and workingDirectory as the local checkout path.",
        "The tool injects a fresh installation token only into the one push command and does not persist credentials into git config.",
        "Prefer push_github_branch over ad hoc authenticated git push command strings for routine PR workflows.",
      ],
      promptSnippet: "Push a local git branch to GitHub with installation-token auth",
    };
  }

  private static normalizeRepository(repository: string): string {
    const normalizedRepository = repository.trim();
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(normalizedRepository)) {
      throw new Error("repository must be in owner/name form.");
    }

    return normalizedRepository;
  }

  private static normalizeBranch(branch: string): string {
    const normalizedBranch = branch.trim();
    if (!normalizedBranch) {
      throw new Error("branch is required.");
    }
    if (/\s/u.test(normalizedBranch) || AgentGithubPushBranchTool.hasControlCharacters(normalizedBranch)) {
      throw new Error("branch must not contain whitespace or control characters.");
    }

    return normalizedBranch;
  }

  private static hasControlCharacters(value: string): boolean {
    return [...value].some((character) => {
      const characterCode = character.charCodeAt(0);
      return characterCode < 32 || characterCode === 127;
    });
  }

  private static buildDisplayCommand(repository: string, branch: string): string {
    return [
      "git push --",
      AgentGithubPushBranchTool.shellQuote(`https://github.com/${repository}.git`),
      AgentGithubPushBranchTool.shellQuote(`refs/heads/${branch}:refs/heads/${branch}`),
    ].join(" ");
  }

  private static buildShellCommand(repository: string, branch: string): string {
    const pushUrl = `https://github.com/${repository}.git`;
    return [
      "AUTH_HEADER=$(printf '%s' \"x-access-token:${GITHUB_INSTALLATION_TOKEN}\" | base64 | tr -d '\\n')",
      "&&",
      "git",
      "-c credential.helper=",
      "-c http.https://github.com/.extraheader=\"AUTHORIZATION: basic ${AUTH_HEADER}\"",
      "push --",
      AgentGithubPushBranchTool.shellQuote(pushUrl),
      AgentGithubPushBranchTool.shellQuote(`refs/heads/${branch}:refs/heads/${branch}`),
    ].join(" ");
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `"'"'`)}'`;
  }
}
