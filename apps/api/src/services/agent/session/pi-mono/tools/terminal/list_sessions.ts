import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Lists tmux sessions that currently exist inside the leased environment so the agent can decide
 * which session id to reuse.
 */
export class AgentListTerminalSessionsTool {
  private static readonly parameters = AgentToolParameterSchema.object({});
  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentListTerminalSessionsTool.parameters> {
    return {
      description: "List the tmux-backed sessions currently available inside the environment.",
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
      label: "list_pty_sessions",
      name: "list_pty_sessions",
      parameters: AgentListTerminalSessionsTool.parameters,
      promptGuidelines: [
        "Use list_pty_sessions when you need to inspect existing tmux sessions before choosing one to reuse.",
      ],
      promptSnippet: "List environment terminal sessions",
    };
  }
}
