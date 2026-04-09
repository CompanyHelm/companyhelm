import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Continues interacting with an existing PTY session by sending raw terminal input and returning
 * the newly emitted pane output.
 */
export class AgentPtySendInputTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    input: Type.String({
      description: "Raw terminal input to write into the running environment PTY session.",
    }),
    sessionId: Type.String({
      description: "Environment session id returned by pty_exec.",
    }),
    yield_time_ms: Type.Optional(Type.Number({
      description: "How long to wait for output before returning control, in milliseconds.",
    })),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentPtySendInputTool.parameters> {
    return {
      description: "Send additional terminal input to an existing environment PTY session and return new output.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        const result = await environment.sendInput(params.sessionId, params.input, params.yield_time_ms);
        return {
          content: [{
            text: AgentTerminalResultFormatter.formatCommandResult(result),
            type: "text",
          }],
        };
      },
      label: "pty_send_input",
      name: "pty_send_input",
      parameters: AgentPtySendInputTool.parameters,
      promptGuidelines: [
        "Use pty_send_input to continue interacting with an existing tmux-backed PTY shell after pty_exec returns.",
      ],
      promptSnippet: "Send input to an environment PTY session",
    };
  }
}
