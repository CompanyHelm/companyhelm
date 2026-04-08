import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/session/pi-mono/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Moves the mouse cursor to one absolute coordinate in the E2B desktop environment.
 */
export class AgentComputeE2bComputerUseMoveMouseTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    x: Type.Number({
      description: "Destination x coordinate.",
    }),
    y: Type.Number({
      description: "Destination y coordinate.",
    }),
  });

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseMoveMouseTool.parameters> {
    return {
      description: "Move the mouse cursor to an absolute coordinate.",
      execute: async (_toolCallId, params) => {
        await this.toolService.moveMouse(params.x, params.y);
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              `Moved mouse to (${params.x}, ${params.y}).`,
            ),
            type: "text",
          }],
          details: {
            type: "computer_use_move_mouse",
            x: params.x,
            y: params.y,
          },
        };
      },
      label: "computer_move_mouse",
      name: "computer_move_mouse",
      parameters: AgentComputeE2bComputerUseMoveMouseTool.parameters,
      promptSnippet: "Move the mouse cursor",
    };
  }
}
