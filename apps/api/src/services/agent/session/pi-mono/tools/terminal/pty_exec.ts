import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { Logger as PinoLogger } from "pino";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentEnvironmentShellTimeoutError } from "../../../../../environments/providers/shell_interface.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Executes shell commands inside the leased environment, creating a tmux-backed PTY session when
 * needed and returning the session id so later tool calls can continue the same shell.
 */
export class AgentPtyExecTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    columns: Type.Optional(Type.Number({
      description: "Optional terminal width to use when creating a new PTY session.",
    })),
    command: Type.String({
      description: "Shell command to execute inside the environment PTY session.",
    }),
    environment: Type.Optional(Type.Record(
      Type.String(),
      Type.String(),
      {
        description: "Optional environment variables to apply for this PTY command execution.",
      },
    )),
    keepSession: Type.Optional(Type.Boolean({
      description: "Whether to preserve a newly created PTY session if the command finishes before this call returns. If the command is still running when yield_time_ms elapses, the session stays alive regardless.",
    })),
    rows: Type.Optional(Type.Number({
      description: "Optional terminal height to use when creating a new PTY session.",
    })),
    sessionId: Type.Optional(Type.String({
      description: "Existing environment session id to reuse for follow-up PTY commands.",
    })),
    workingDirectory: Type.Optional(Type.String({
      description: "Optional working directory to use for this PTY command execution.",
    })),
    yield_time_ms: Type.Optional(Type.Number({
      description: "How long to wait for PTY output before returning control, in milliseconds.",
    })),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly logger: PinoLogger;

  constructor(promptScope: AgentEnvironmentPromptScope, logger: PinoLogger) {
    this.promptScope = promptScope;
    this.logger = logger;
  }

  createDefinition(): ToolDefinition<typeof AgentPtyExecTool.parameters> {
    return {
      description: "Execute a shell command inside an agent environment PTY session and return captured output.",
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
      label: "pty_exec",
      name: "pty_exec",
      parameters: AgentPtyExecTool.parameters,
      promptGuidelines: [
        "Use pty_exec to create or continue work in an environment PTY session.",
        "When sessionId is omitted pty_exec creates a fresh tmux-backed PTY session.",
        "If the command is still running when the tool returns after yield_time_ms, the session remains open and sessionId is returned regardless of keepSession.",
        "Completed one-shot commands auto-close their newly created PTY session unless keepSession is true.",
        "Reuse the returned sessionId when you want follow-up tool calls to target the same shell.",
      ],
      promptSnippet: "Execute commands in the environment PTY",
    };
  }
}
