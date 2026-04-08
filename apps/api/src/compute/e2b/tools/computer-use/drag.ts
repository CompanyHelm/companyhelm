import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/session/pi-mono/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Performs one drag gesture between two absolute coordinates in the E2B desktop environment.
 */
export class AgentComputeE2bComputerUseDragTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    fromX: Type.Number({
      description: "Starting x coordinate.",
    }),
    fromY: Type.Number({
      description: "Starting y coordinate.",
    }),
    toX: Type.Number({
      description: "Ending x coordinate.",
    }),
    toY: Type.Number({
      description: "Ending y coordinate.",
    }),
  });

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseDragTool.parameters> {
    return {
      description: "Drag the mouse between two absolute coordinates inside the E2B desktop environment.",
      execute: async (_toolCallId, params) => {
        await this.toolService.drag([params.fromX, params.fromY], [params.toX, params.toY]);
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              `Dragged mouse from (${params.fromX}, ${params.fromY}) to (${params.toX}, ${params.toY}).`,
            ),
            type: "text",
          }],
          details: {
            from: [params.fromX, params.fromY],
            to: [params.toX, params.toY],
            type: "computer_use_drag",
          },
        };
      },
      label: "computer_drag",
      name: "computer_drag",
      parameters: AgentComputeE2bComputerUseDragTool.parameters,
      promptSnippet: "Drag the mouse between coordinates",
    };
  }
}
