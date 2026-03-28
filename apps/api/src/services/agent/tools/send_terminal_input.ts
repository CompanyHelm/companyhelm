import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentEnvironmentPromptScope } from "../environment/prompt_scope.ts";
import { AgentToolResultFormatter } from "./result_formatter.ts";

/**
 * Continues interacting with an existing tmux session by sending raw terminal input and returning
 * the newly emitted pane output.
 */
export class AgentSendTerminalInputTool {
  private static readonly parameters = Type.Object({
    input: Type.String({
      description: "Raw terminal input to write into the running environment tmux session.",
    }),
    sessionId: Type.String({
      description: "Environment session id returned by execute_command.",
    }),
    yield_time_ms: Type.Optional(Type.Number({
      description: "How long to wait for output before returning control, in milliseconds.",
    })),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentSendTerminalInputTool.parameters> {
    return {
      description: "Send additional terminal input to an existing environment tmux session and return new output.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        const result = await environment.sendInput(params.sessionId, params.input, params.yield_time_ms);
        return {
          content: [{
            text: AgentToolResultFormatter.formatCommandResult(result),
            type: "text",
          }],
        };
      },
      label: "send_pty_input",
      name: "send_pty_input",
      parameters: AgentSendTerminalInputTool.parameters,
      promptGuidelines: [
        "Use send_pty_input to continue interacting with an existing tmux shell after execute_command returns.",
      ],
      promptSnippet: "Send input to an environment terminal session",
    };
  }
}
