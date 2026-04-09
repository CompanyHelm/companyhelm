import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Reads PTY output directly from tmux without relying on any API-side terminal buffer.
 */
export class AgentPtyReadOutputTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    afterOffset: Type.Optional(Type.Number({
      description: "Character offset cursor returned by the previous read. Omit for the first page.",
    })),
    limit: Type.Optional(Type.Number({
      description: "Maximum number of characters to return from the tmux pane capture.",
    })),
    sessionId: Type.String({
      description: "Environment session id returned by pty_exec.",
    }),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentPtyReadOutputTool.parameters> {
    return {
      description: "Read pane output directly from an existing environment PTY session.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        const page = await environment.readOutput(params.sessionId, params.afterOffset ?? null, params.limit ?? 4_000);
        return {
          content: [{
            text: AgentTerminalResultFormatter.formatOutputResult(params.sessionId, page),
            type: "text",
          }],
        };
      },
      label: "pty_read_output",
      name: "pty_read_output",
      parameters: AgentPtyReadOutputTool.parameters,
      promptGuidelines: [
        "Use pty_read_output to fetch more output from a PTY session after an earlier execute or input call.",
      ],
      promptSnippet: "Read environment PTY output",
    };
  }
}
