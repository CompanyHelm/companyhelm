import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../../../../services/agent/session/pi-mono/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Captures a PNG screenshot from the current E2B desktop session.
 */
export class AgentComputeE2bComputerUseScreenshotTool {
  private static readonly parameters = AgentToolParameterSchema.object({});

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseScreenshotTool.parameters> {
    return {
      description: "Capture a PNG screenshot of the current desktop state.",
      execute: async () => {
        const screenshot = await this.toolService.screenshot();
        return {
          content: [{
            data: screenshot.base64EncodedPng,
            mimeType: "image/png",
            type: "image",
          }],
          details: {
            byteLength: screenshot.byteLength,
            type: "computer_use_screenshot",
          },
        };
      },
      label: "computer_screenshot",
      name: "computer_screenshot",
      parameters: AgentComputeE2bComputerUseScreenshotTool.parameters,
      promptSnippet: "Capture a desktop screenshot",
    };
  }
}
