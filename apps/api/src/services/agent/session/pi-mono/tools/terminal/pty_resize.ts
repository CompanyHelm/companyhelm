import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";

/**
 * Adjusts the tmux window size for an existing PTY session so interactive terminal programs can
 * react to the requested viewport dimensions.
 */
export class AgentPtyResizeTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    columns: Type.Number({
      description: "Target terminal width in columns.",
    }),
    rows: Type.Number({
      description: "Target terminal height in rows.",
    }),
    sessionId: Type.String({
      description: "Environment session id returned by pty_exec.",
    }),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentPtyResizeTool.parameters> {
    return {
      description: "Resize the tmux window backing an existing environment PTY session.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        await environment.resizeSession(params.sessionId, params.columns, params.rows);
        return {
          content: [{
            text: `Resized session ${params.sessionId} to ${params.columns} columns by ${params.rows} rows.`,
            type: "text",
          }],
        };
      },
      label: "pty_resize",
      name: "pty_resize",
      parameters: AgentPtyResizeTool.parameters,
      promptGuidelines: [
        "Use pty_resize when terminal applications depend on viewport dimensions.",
      ],
      promptSnippet: "Resize an environment PTY session",
    };
  }
}
