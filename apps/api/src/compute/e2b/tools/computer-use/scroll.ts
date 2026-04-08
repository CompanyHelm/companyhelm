import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Scrolls the mouse wheel in the desktop environment.
 */
export class AgentComputeE2bComputerUseScrollTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    amount: Type.Optional(Type.Number({
      description: "Optional scroll amount. Omit to use the desktop SDK default.",
    })),
    direction: Type.Optional(Type.Union([
      Type.Literal("down"),
      Type.Literal("up"),
    ], {
      description: "Optional scroll direction. Omit to use the desktop SDK default.",
    })),
  });

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseScrollTool.parameters> {
    return {
      description: "Scroll the mouse wheel inside the desktop environment.",
      execute: async (_toolCallId, params) => {
        await this.toolService.scroll(params.direction, params.amount);
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              `Scrolled ${params.direction ?? "default direction"}${typeof params.amount === "number" ? ` by ${params.amount}` : ""}.`,
            ),
            type: "text",
          }],
          details: {
            amount: params.amount ?? null,
            direction: params.direction ?? null,
            type: "computer_use_scroll",
          },
        };
      },
      label: "computer_scroll",
      name: "computer_scroll",
      parameters: AgentComputeE2bComputerUseScrollTool.parameters,
      promptSnippet: "Scroll the mouse wheel",
    };
  }
}
