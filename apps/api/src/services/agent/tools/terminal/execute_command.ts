import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { Logger as PinoLogger } from "pino";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../environment/prompt_scope.ts";
import { AgentEnvironmentShellTimeoutError } from "../../compute/shell_interface.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Executes shell commands inside the leased environment, creating a tmux session when needed and
 * returning the session id so later tool calls can continue the same shell.
 */
export class AgentExecuteCommandTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    columns: Type.Optional(Type.Number({
      description: "Optional terminal width to use when creating a new session.",
    })),
    command: Type.String({
      description: "Shell command to execute inside the environment tmux session.",
    }),
    environment: Type.Optional(Type.Record(
      Type.String(),
      Type.String(),
      {
        description: "Optional environment variables to apply for this command execution.",
      },
    )),
    keepSession: Type.Optional(Type.Boolean({
      description: "Whether to preserve a newly created session after a command finishes within the current call.",
    })),
    rows: Type.Optional(Type.Number({
      description: "Optional terminal height to use when creating a new session.",
    })),
    sessionId: Type.Optional(Type.String({
      description: "Existing environment session id to reuse for follow-up commands.",
    })),
    workingDirectory: Type.Optional(Type.String({
      description: "Optional working directory to use for this command execution.",
    })),
    yield_time_ms: Type.Optional(Type.Number({
      description: "How long to wait for output before returning control, in milliseconds.",
    })),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly logger: PinoLogger;

  constructor(promptScope: AgentEnvironmentPromptScope, logger: PinoLogger) {
    this.promptScope = promptScope;
    this.logger = logger;
  }

  createDefinition(): ToolDefinition<typeof AgentExecuteCommandTool.parameters> {
    return {
      description: "Execute a shell command inside an agent environment tmux session and return captured output.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        let result;
        try {
          result = await environment.executeCommand(params);
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
            text: AgentTerminalResultFormatter.formatCommandResult(result),
            type: "text",
          }],
          details: {
            command: params.command,
            completed: result.completed,
            cwd: params.workingDirectory ?? null,
            exitCode: result.exitCode,
            sessionId: result.sessionId,
            type: "terminal",
          },
        };
      },
      label: "execute_command",
      name: "execute_command",
      parameters: AgentExecuteCommandTool.parameters,
      promptGuidelines: [
        "Use execute_command to create or continue work in an environment tmux session.",
        "When sessionId is omitted execute_command creates a fresh tmux session.",
        "Completed one-shot commands auto-close their new session unless keepSession is true.",
        "Reuse the returned sessionId when you want follow-up tool calls to target the same shell.",
      ],
      promptSnippet: "Execute commands in the environment",
    };
  }
}
