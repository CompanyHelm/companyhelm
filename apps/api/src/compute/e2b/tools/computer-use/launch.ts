import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/session/pi-mono/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Launches a desktop application inside the connected E2B sandbox.
 */
export class AgentComputeE2bComputerUseLaunchTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    application: Type.String({
      description: "Desktop application name to launch, for example Chrome or Terminal.",
    }),
    uri: Type.Optional(Type.String({
      description: "Optional URI or file path to open with the application.",
    })),
  });

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseLaunchTool.parameters> {
    return {
      description: "Launch a desktop application in the E2B environment.",
      execute: async (_toolCallId, params) => {
        await this.toolService.launch(params.application, params.uri);
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              params.uri
                ? `Launched "${params.application}" with "${params.uri}".`
                : `Launched "${params.application}".`,
            ),
            type: "text",
          }],
          details: {
            application: params.application,
            type: "computer_use_launch",
            uri: params.uri ?? null,
          },
        };
      },
      label: "computer_launch",
      name: "computer_launch",
      parameters: AgentComputeE2bComputerUseLaunchTool.parameters,
      promptSnippet: "Launch a desktop application",
    };
  }
}
