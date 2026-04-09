import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { Logger as PinoLogger } from "pino";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentEnvironmentShellTimeoutError } from "../../../../../environments/providers/shell_interface.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Executes shell commands inside one leased-environment PTY, creating the PTY under the requested
 * id when it does not already exist.
 */
export class AgentPtyExecTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    columns: Type.Optional(Type.Number({
      description: "Optional terminal width to use if pty_exec needs to create the requested PTY first.",
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
    pty_id: Type.String({
      description: "Required logical PTY identifier. If the PTY does not exist yet, pty_exec creates it under this id first.",
    }),
    rows: Type.Optional(Type.Number({
      description: "Optional terminal height to use if pty_exec needs to create the requested PTY first.",
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
          result = await environment.executeCommand({
            columns: params.columns,
            command: params.command,
            environment: params.environment,
            ptyId: params.pty_id,
            rows: params.rows,
            workingDirectory: params.workingDirectory,
            yield_time_ms: params.yield_time_ms,
          });
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
            pty_id: result.ptyId,
            type: "pty",
          },
        };
      },
      label: "pty_exec",
      name: "pty_exec",
      parameters: AgentPtyExecTool.parameters,
      promptGuidelines: [
        "Use pty_exec to create or continue work in one named environment PTY.",
        "pty_exec requires pty_id. If that PTY does not exist yet, pty_exec creates it first under the requested id.",
        "PTYs are durable and are not automatically garbage-collected after commands finish.",
        "Use pty_kill when you are done with a PTY and want to remove it.",
      ],
      promptSnippet: "Execute commands in the environment PTY",
    };
  }
}
