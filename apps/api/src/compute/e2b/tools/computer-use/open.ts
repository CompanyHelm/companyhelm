import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Opens a file path or URL in the sandbox's default desktop application.
 */
export class AgentComputeE2bComputerUseOpenTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    fileOrUrl: Type.String({
      description: "Absolute file path or URL to open.",
    }),
  });

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseOpenTool.parameters> {
    return {
      description: "Open a file or URL with the environment's default desktop application.",
      execute: async (_toolCallId, params) => {
        await this.toolService.open(params.fileOrUrl);
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              `Opened "${params.fileOrUrl}".`,
            ),
            type: "text",
          }],
          details: {
            fileOrUrl: params.fileOrUrl,
            type: "computer_use_open",
          },
        };
      },
      label: "computer_open",
      name: "computer_open",
      parameters: AgentComputeE2bComputerUseOpenTool.parameters,
      promptSnippet: "Open a file or URL in the desktop environment",
    };
  }
}
