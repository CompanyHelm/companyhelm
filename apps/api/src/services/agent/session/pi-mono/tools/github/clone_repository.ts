import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { GithubClient } from "../../../../../../github/client.ts";
import { AgentGithubInstallationService } from "./installation_service.ts";
import { AgentGithubResultFormatter } from "./result_formatter.ts";

/**
 * Clones one GitHub repository with installation-token-backed HTTPS auth. This keeps git clone
 * behavior separate from generic gh CLI execution because git's credential flow differs from gh's
 * API-token flow and must be forced into a non-interactive mode.
 */
export class AgentGithubCloneRepositoryTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    directory: Type.Optional(Type.String({
      description: "Optional directory name to clone into. Defaults to the repository name.",
    })),
    installationId: Type.String({
      description: "GitHub installation id linked to the current company.",
    }),
    repository: Type.String({
      description: "Repository full name in owner/name form.",
    }),
    workingDirectory: Type.Optional(Type.String({
      description: "Optional working directory to use for the clone command.",
    })),
    yield_time_ms: Type.Optional(Type.Number({
      description: "How long to wait for output before returning control, in milliseconds.",
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

  createDefinition(): ToolDefinition<typeof AgentGithubCloneRepositoryTool.parameters> {
    return {
      description: "Clone a GitHub repository inside the leased environment using a linked installation token without interactive auth prompts.",
      execute: async (_toolCallId, params) => {
        const repository = AgentGithubCloneRepositoryTool.normalizeRepository(params.repository);
        const token = await this.installationService.getInstallationAccessToken(params.installationId);
        const environment = await this.promptScope.getEnvironment();
        const directory = AgentGithubCloneRepositoryTool.resolveDirectory(repository, params.directory);
        const result = await environment.executeCommand({
          command: AgentGithubCloneRepositoryTool.buildShellCommand(repository, directory),
          environment: {
            GH_PROMPT_DISABLED: "1",
            GIT_TERMINAL_PROMPT: "0",
            GITHUB_INSTALLATION_TOKEN: token,
          },
          workingDirectory: params.workingDirectory,
          yield_time_ms: params.yield_time_ms,
        });

        return {
          content: [{
            text: AgentGithubResultFormatter.formatExecResult(result),
            type: "text",
          }],
          details: {
            command: AgentGithubCloneRepositoryTool.buildDisplayCommand(repository, directory),
            completed: result.completed,
            cwd: params.workingDirectory ?? null,
            directory,
            exitCode: result.exitCode,
            installationId: GithubClient.validateInstallationId(params.installationId),
            repository,
            sessionId: result.sessionId,
          },
        };
      },
      label: "clone_github_repository",
      name: "clone_github_repository",
      parameters: AgentGithubCloneRepositoryTool.parameters,
      promptGuidelines: [
        "Use clone_github_repository instead of gh_exec for cloning GitHub repositories.",
        "Call list_github_installations first if you do not already know the installation id to target.",
        "Pass repository in owner/name form.",
        "Use directory when the checkout should land in a custom folder name.",
      ],
      promptSnippet: "Clone a repository from a linked GitHub installation",
    };
  }

  private static normalizeRepository(repository: string): string {
    const normalizedRepository = repository.trim();
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(normalizedRepository)) {
      throw new Error("repository must be in owner/name form.");
    }

    return normalizedRepository;
  }

  private static resolveDirectory(repository: string, directory?: string): string {
    const normalizedDirectory = directory?.trim();
    if (normalizedDirectory && normalizedDirectory.length > 0) {
      return normalizedDirectory;
    }

    return repository.split("/")[1] ?? repository;
  }

  private static buildDisplayCommand(repository: string, directory: string): string {
    return `git clone ${AgentGithubCloneRepositoryTool.shellQuote(`https://github.com/${repository}.git`)} ${AgentGithubCloneRepositoryTool.shellQuote(directory)}`;
  }

  private static buildShellCommand(repository: string, directory: string): string {
    const cloneUrl = `https://github.com/${repository}.git`;
    return [
      "AUTH_HEADER=$(printf '%s' \"x-access-token:${GITHUB_INSTALLATION_TOKEN}\" | base64 | tr -d '\\n')",
      "&&",
      "git",
      "-c credential.helper=",
      "-c http.https://github.com/.extraheader=\"AUTHORIZATION: basic ${AUTH_HEADER}\"",
      "clone --",
      AgentGithubCloneRepositoryTool.shellQuote(cloneUrl),
      AgentGithubCloneRepositoryTool.shellQuote(directory),
    ].join(" ");
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
