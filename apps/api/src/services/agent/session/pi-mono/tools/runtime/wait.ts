import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentRuntimeToolService } from "./service.ts";

/**
 * Suspends the agent for a fixed amount of time so it can give external systems, background work,
 * or UI flows time to settle before taking the next action.
 */
export class AgentRuntimeWaitTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    milliseconds: Type.Number({
      description: "How long to wait before continuing, in milliseconds.",
      minimum: 0,
    }),
  });

  private readonly toolService: AgentRuntimeToolService;

  constructor(toolService: AgentRuntimeToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentRuntimeWaitTool.parameters> {
    return {
      description: "Pause for a fixed number of milliseconds before continuing.",
      execute: async (_toolCallId, params) => {
        await this.toolService.wait(params.milliseconds);
        return {
          content: [{
            text: `Waited ${params.milliseconds}ms.`,
            type: "text",
          }],
          details: {
            milliseconds: params.milliseconds,
            type: "wait",
          },
        };
      },
      label: "wait",
      name: "wait",
      parameters: AgentRuntimeWaitTool.parameters,
      promptGuidelines: [
        "Use wait for a short fixed delay when another system needs time before the next action.",
        "Prefer verification-oriented tools over repeated blind waits when you can observe the condition directly.",
      ],
      promptSnippet: "Pause for a fixed duration",
    };
  }
}
