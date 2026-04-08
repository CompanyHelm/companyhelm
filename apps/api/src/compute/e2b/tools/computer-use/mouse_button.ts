import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

type MouseButtonAction = "press" | "release";

/**
 * Exposes low-level mouse button press and release operations for drag workflows that need manual
 * control over button state.
 */
export class AgentComputeE2bComputerUseMouseButtonTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    button: Type.Optional(Type.Union([
      Type.Literal("left"),
      Type.Literal("middle"),
      Type.Literal("right"),
    ], {
      description: "Optional button to target. Defaults to the E2B SDK default button.",
    })),
  });

  private readonly action: MouseButtonAction;
  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(action: MouseButtonAction, toolService: AgentComputeE2bComputerUseToolService) {
    this.action = action;
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseMouseButtonTool.parameters> {
    return {
      description: this.action === "press"
        ? "Press and hold a mouse button."
        : "Release a previously pressed mouse button.",
      execute: async (_toolCallId, params) => {
        if (this.action === "press") {
          await this.toolService.mousePress(params.button);
        } else {
          await this.toolService.mouseRelease(params.button);
        }

        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              `${this.action === "press" ? "Pressed" : "Released"} ${params.button ?? "default"} mouse button.`,
            ),
            type: "text",
          }],
          details: {
            action: this.action,
            button: params.button ?? null,
            type: "computer_use_mouse_button",
          },
        };
      },
      label: this.getToolName(),
      name: this.getToolName(),
      parameters: AgentComputeE2bComputerUseMouseButtonTool.parameters,
      promptSnippet: this.action === "press" ? "Press a mouse button" : "Release a mouse button",
    };
  }

  private getToolName(): string {
    return this.action === "press" ? "computer_mouse_press" : "computer_mouse_release";
  }
}
