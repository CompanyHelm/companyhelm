import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Waits for a fixed duration without performing any other desktop action.
 */
export class AgentComputeE2bComputerUseWaitTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    milliseconds: Type.Number({
      description: "How long to wait, in milliseconds.",
    }),
  });

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseWaitTool.parameters> {
    return {
      description: "Wait for a fixed number of milliseconds inside the desktop environment.",
      execute: async (_toolCallId, params) => {
        await this.toolService.wait(params.milliseconds);
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              `Waited ${params.milliseconds}ms.`,
            ),
            type: "text",
          }],
          details: {
            milliseconds: params.milliseconds,
            type: "computer_use_wait",
          },
        };
      },
      label: "computer_wait",
      name: "computer_wait",
      parameters: AgentComputeE2bComputerUseWaitTool.parameters,
      promptSnippet: "Wait inside the desktop environment",
    };
  }
}
