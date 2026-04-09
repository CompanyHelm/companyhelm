import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Lists tmux-backed PTYs that currently exist inside the leased environment so the agent can
 * decide which named PTY to reuse.
 */
export class AgentPtyListTool {
  private static readonly parameters = AgentToolParameterSchema.object({});
  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentPtyListTool.parameters> {
    return {
      description: "List the tmux-backed PTYs currently available inside the environment.",
      execute: async () => {
        const environment = await this.promptScope.getEnvironment();
        const ptys = await environment.listPtys();
        return {
          content: [{
            text: AgentTerminalResultFormatter.formatPtyList(ptys),
            type: "text",
          }],
        };
      },
      label: "pty_list",
      name: "pty_list",
      parameters: AgentPtyListTool.parameters,
      promptGuidelines: [
        "Use pty_list when you need to inspect existing tmux-backed PTYs before choosing one to reuse.",
      ],
      promptSnippet: "List environment PTYs",
    };
  }
}
