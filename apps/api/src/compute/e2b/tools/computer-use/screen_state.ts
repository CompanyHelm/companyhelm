import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../../../../services/agent/session/pi-mono/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

type ScreenStateToolKind = "cursorPosition" | "screenSize";

/**
 * Reads instantaneous desktop state from the E2B SDK without mutating the environment.
 */
export class AgentComputeE2bComputerUseScreenStateTool {
  private static readonly parameters = AgentToolParameterSchema.object({});

  private readonly kind: ScreenStateToolKind;
  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(kind: ScreenStateToolKind, toolService: AgentComputeE2bComputerUseToolService) {
    this.kind = kind;
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseScreenStateTool.parameters> {
    return {
      description: this.kind === "cursorPosition"
        ? "Return the current mouse cursor position."
        : "Return the desktop screen size.",
      execute: async () => {
        if (this.kind === "cursorPosition") {
          const position = await this.toolService.getCursorPosition();
          return {
            content: [{
              text: AgentComputeE2bComputerUseResultFormatter.formatCursorPosition(position),
              type: "text",
            }],
            details: {
              type: "computer_use_cursor_position",
              x: position.x,
              y: position.y,
            },
          };
        }

        const size = await this.toolService.getScreenSize();
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatScreenSize(size),
            type: "text",
          }],
          details: {
            height: size.height,
            type: "computer_use_screen_size",
            width: size.width,
          },
        };
      },
      label: this.getToolName(),
      name: this.getToolName(),
      parameters: AgentComputeE2bComputerUseScreenStateTool.parameters,
      promptSnippet: this.kind === "cursorPosition" ? "Read the cursor position" : "Read the screen size",
    };
  }

  private getToolName(): string {
    return this.kind === "cursorPosition"
      ? "computer_get_cursor_position"
      : "computer_get_screen_size";
  }
}
