import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { Logger as PinoLogger } from "pino";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentEnvironmentShellTimeoutError } from "../../../../../environments/providers/shell_interface.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Executes a one-shot bash command directly through the provider shell adapter without allocating
 * a tmux-backed PTY session.
 */
export class AgentBashExecTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    command: Type.String({
      description: "Bash command body to execute with bash -lc inside the leased environment.",
    }),
    environment: Type.Optional(Type.Record(
      Type.String(),
      Type.String(),
      {
        description: "Optional environment variables to apply for this bash execution.",
      },
    )),
    timeoutSeconds: Type.Optional(Type.Number({
      description: "Optional timeout in seconds for the direct provider shell execution.",
    })),
    workingDirectory: Type.Optional(Type.String({
      description: "Optional working directory to use for the bash execution.",
    })),
  });

  private readonly logger: PinoLogger;
  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope, logger: PinoLogger) {
    this.promptScope = promptScope;
    this.logger = logger;
  }

  createDefinition(): ToolDefinition<typeof AgentBashExecTool.parameters> {
    return {
      description: "Execute a one-shot bash command directly through the environment provider shell.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        let result;
        try {
          result = await environment.executeBashCommand(params);
        } catch (error) {
          if (error instanceof AgentEnvironmentShellTimeoutError) {
            this.logger.warn({
              command: error.command,
              err: error,
              provider: error.provider,
              timeoutSeconds: error.timeoutSeconds,
              workingDirectory: error.workingDirectory,
            }, "environment shell command timed out");
          }
          throw error;
        }

        return {
          content: [{
            text: AgentTerminalResultFormatter.formatDirectShellCommandResult(result),
            type: "text",
          }],
          details: {
            command: params.command,
            cwd: params.workingDirectory ?? null,
            exitCode: result.exitCode,
            timeoutSeconds: params.timeoutSeconds ?? null,
            type: "bash",
          },
        };
      },
      label: "bash_exec",
      name: "bash_exec",
      parameters: AgentBashExecTool.parameters,
      promptGuidelines: [
        "Use bash_exec for one-shot commands that should execute directly through the provider shell instead of a tmux-backed PTY session.",
        "The command always runs through bash -lc, so shell features such as pipes, globs, and command substitution are available.",
        "Use pty_exec instead when you need a reusable PTY session or follow-up interaction through pty_send_input.",
        "Pass timeoutSeconds when the command should fail instead of waiting indefinitely on the provider shell.",
      ],
      promptSnippet: "Execute a one-shot bash command",
    };
  }
}
