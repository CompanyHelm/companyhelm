import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Lists tmux-backed PTY sessions that currently exist inside the leased environment so the agent
 * can decide which session id to reuse.
 */
export class AgentPtyListSessionsTool {
  private static readonly parameters = AgentToolParameterSchema.object({});
  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentPtyListSessionsTool.parameters> {
    return {
      description: "List the tmux-backed PTY sessions currently available inside the environment.",
      execute: async () => {
        const environment = await this.promptScope.getEnvironment();
        const sessions = await environment.listSessions();
        return {
          content: [{
            text: AgentTerminalResultFormatter.formatSessionList(sessions),
            type: "text",
          }],
        };
      },
      label: "pty_list_sessions",
      name: "pty_list_sessions",
      parameters: AgentPtyListSessionsTool.parameters,
      promptGuidelines: [
        "Use pty_list_sessions when you need to inspect existing tmux-backed PTY sessions before choosing one to reuse.",
      ],
      promptSnippet: "List environment PTY sessions",
    };
  }
}
