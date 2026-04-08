import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

type ClickKind = "double" | "left" | "middle" | "right";

/**
 * Exposes one mouse click variant from the E2B desktop SDK as its own PI Mono tool definition.
 */
export class AgentComputeE2bComputerUseClickTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    x: Type.Optional(Type.Number({
      description: "Optional x coordinate. When omitted, the current cursor position is used.",
    })),
    y: Type.Optional(Type.Number({
      description: "Optional y coordinate. When omitted, the current cursor position is used.",
    })),
  });

  private readonly kind: ClickKind;
  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(kind: ClickKind, toolService: AgentComputeE2bComputerUseToolService) {
    this.kind = kind;
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseClickTool.parameters> {
    return {
      description: `${this.getActionLabel()} inside the leased E2B desktop environment.`,
      execute: async (_toolCallId, params) => {
        await this.executeClick(params.x, params.y);
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              `${this.getActionLabel()}${this.formatCoordinates(params.x, params.y)}`,
            ),
            type: "text",
          }],
          details: {
            action: this.kind,
            type: "computer_use_click",
            x: params.x ?? null,
            y: params.y ?? null,
          },
        };
      },
      label: this.getToolName(),
      name: this.getToolName(),
      parameters: AgentComputeE2bComputerUseClickTool.parameters,
      promptGuidelines: [
        "Use these click tools only when the current environment template includes computer-use support.",
        "Pass x and y when you need deterministic clicks. Omit them to click at the current cursor position.",
      ],
      promptSnippet: `${this.getActionLabel()} in the desktop environment`,
    };
  }

  private async executeClick(x?: number, y?: number): Promise<void> {
    switch (this.kind) {
      case "double":
        await this.toolService.doubleClick(x, y);
        return;
      case "left":
        await this.toolService.leftClick(x, y);
        return;
      case "middle":
        await this.toolService.middleClick(x, y);
        return;
      case "right":
        await this.toolService.rightClick(x, y);
        return;
    }
  }

  private formatCoordinates(x?: number, y?: number): string {
    if (typeof x !== "number" || typeof y !== "number") {
      return " at the current cursor position.";
    }

    return ` at (${x}, ${y}).`;
  }

  private getActionLabel(): string {
    switch (this.kind) {
      case "double":
        return "Double click";
      case "left":
        return "Left click";
      case "middle":
        return "Middle click";
      case "right":
        return "Right click";
    }
  }

  private getToolName(): string {
    switch (this.kind) {
      case "double":
        return "computer_double_click";
      case "left":
        return "computer_left_click";
      case "middle":
        return "computer_middle_click";
      case "right":
        return "computer_right_click";
    }
  }
}
