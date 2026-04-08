import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { GithubClient } from "../../../../../../github/client.ts";
import { AgentGithubInstallationService } from "./installation_service.ts";
import { AgentGithubResultFormatter } from "./result_formatter.ts";

/**
 * Executes GitHub CLI commands inside the leased environment after resolving an installation
 * access token. The token is injected only into the single command execution environment, so it is
 * not persisted into the long-lived tmux shell state.
 */
export class AgentGithubExecTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    args: Type.Array(Type.String(), {
      description: "Arguments to pass to the gh CLI, excluding the leading gh command.",
      minItems: 1,
    }),
    columns: Type.Optional(Type.Number({
      description: "Optional terminal width to use when creating a new session.",
    })),
    installationId: Type.String({
      description: "GitHub installation id linked to the current company.",
    }),
    keepSession: Type.Optional(Type.Boolean({
      description: "Whether to preserve a newly created shell session if the gh command finishes before this call returns. If the command is still running when yield_time_ms elapses, the session stays alive regardless.",
    })),
    rows: Type.Optional(Type.Number({
      description: "Optional terminal height to use when creating a new session.",
    })),
    sessionId: Type.Optional(Type.String({
      description: "Existing environment session id to reuse for follow-up GitHub CLI commands.",
    })),
    workingDirectory: Type.Optional(Type.String({
      description: "Optional working directory to use for this GitHub CLI command.",
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

  createDefinition(): ToolDefinition<typeof AgentGithubExecTool.parameters> {
    return {
      description: "Run a gh CLI command inside the leased environment using a GitHub App installation token.",
      execute: async (_toolCallId, params) => {
        AgentGithubExecTool.assertAllowedArgs(params.args);
        const token = await this.installationService.getInstallationAccessToken(params.installationId);
        const environment = await this.promptScope.getEnvironment();
        const displayCommand = AgentGithubExecTool.buildDisplayCommand(params.args);
        const result = await environment.executeCommand({
          columns: params.columns,
          command: AgentGithubExecTool.buildShellCommand(params.args),
          environment: {
            GH_TOKEN: token,
          },
          keepSession: params.keepSession,
          rows: params.rows,
          sessionId: params.sessionId,
          workingDirectory: params.workingDirectory,
          yield_time_ms: params.yield_time_ms,
        });

        return {
          content: [{
            text: AgentGithubResultFormatter.formatExecResult(result),
            type: "text",
          }],
          details: {
            command: displayCommand,
            completed: result.completed,
            cwd: params.workingDirectory ?? null,
            exitCode: result.exitCode,
            installationId: GithubClient.validateInstallationId(params.installationId),
            sessionId: result.sessionId,
          },
        };
      },
      label: "gh_exec",
      name: "gh_exec",
      parameters: AgentGithubExecTool.parameters,
      promptGuidelines: [
        "Use gh_exec when you need the flexibility of the gh CLI against a linked installation.",
        "Call list_github_installations first if you do not already know the installation id to target.",
        "Do not use gh auth commands because the installation token is injected automatically for the command.",
        "If the command is still running when the tool returns after yield_time_ms, the session remains open regardless of keepSession.",
        "Set keepSession to true when you want a newly created shell session to stay alive after the command finishes.",
      ],
      promptSnippet: "Run gh CLI commands against a linked GitHub installation",
    };
  }

  private static assertAllowedArgs(args: string[]): void {
    if (args.length === 0) {
      throw new Error("gh args are required.");
    }

    if ((args[0] ?? "") === "auth") {
      throw new Error("gh auth commands are not allowed in gh_exec.");
    }
  }

  private static buildDisplayCommand(args: string[]): string {
    return `gh ${args.map((argument) => {
      return AgentGithubExecTool.shellQuote(argument);
    }).join(" ")}`;
  }

  private static buildShellCommand(args: string[]): string {
    const ghCommand = AgentGithubExecTool.buildDisplayCommand(args);
    return [
      "command -v gh >/dev/null 2>&1 || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y gh)",
      ghCommand,
    ].join("; ");
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
