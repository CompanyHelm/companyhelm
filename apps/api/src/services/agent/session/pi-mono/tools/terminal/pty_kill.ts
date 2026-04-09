import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";

/**
 * Terminates an existing tmux-backed PTY session immediately.
 */
export class AgentPtyKillTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    pty_id: Type.String({
      description: "Environment PTY identifier returned by pty_exec.",
    }),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentPtyKillTool.parameters> {
    return {
      description: "Kill an environment PTY session immediately.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        await environment.killPty(params.pty_id);
        return {
          content: [{
            text: `Killed PTY ${params.pty_id}.`,
            type: "text",
          }],
        };
      },
      label: "pty_kill",
      name: "pty_kill",
      parameters: AgentPtyKillTool.parameters,
      promptGuidelines: [
        "Use pty_kill when a tmux-backed PTY shell is hung or must be terminated immediately.",
      ],
      promptSnippet: "Kill an environment PTY session",
    };
  }
}
