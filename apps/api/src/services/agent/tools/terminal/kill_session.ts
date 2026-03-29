import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentEnvironmentPromptScope } from "../../environment/prompt_scope.ts";

/**
 * Terminates an existing tmux session immediately.
 */
export class AgentKillTerminalSessionTool {
  private static readonly parameters = Type.Object({
    sessionId: Type.String({
      description: "Environment session id returned by execute_command.",
    }),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentKillTerminalSessionTool.parameters> {
    return {
      description: "Kill an environment tmux session immediately.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        await environment.killSession(params.sessionId);
        return {
          content: [{
            text: `Killed session ${params.sessionId}.`,
            type: "text",
          }],
        };
      },
      label: "kill_session",
      name: "kill_session",
      parameters: AgentKillTerminalSessionTool.parameters,
      promptGuidelines: [
        "Use kill_session when a tmux shell is hung or must be terminated immediately.",
      ],
      promptSnippet: "Kill an environment terminal session",
    };
  }
}
