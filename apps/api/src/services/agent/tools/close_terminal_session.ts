import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentEnvironmentPromptScope } from "../environment/prompt_scope.ts";

/**
 * Closes an environment tmux session when the agent is done with that shell state.
 */
export class AgentCloseTerminalSessionTool {
  private static readonly parameters = Type.Object({
    sessionId: Type.String({
      description: "Environment session id returned by execute_command.",
    }),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentCloseTerminalSessionTool.parameters> {
    return {
      description: "Close an environment tmux session by killing it and releasing its shell state.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        await environment.closeSession(params.sessionId);
        return {
          content: [{
            text: `Closed session ${params.sessionId}.`,
            type: "text",
          }],
        };
      },
      label: "close_session",
      name: "close_session",
      parameters: AgentCloseTerminalSessionTool.parameters,
      promptGuidelines: [
        "Use close_session when you are done with a tmux session and no longer need its shell state.",
      ],
      promptSnippet: "Close an environment terminal session",
    };
  }
}
