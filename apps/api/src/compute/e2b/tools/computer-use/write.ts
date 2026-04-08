import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Types text into the focused desktop target through the E2B SDK's chunked writer.
 */
export class AgentComputeE2bComputerUseWriteTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    chunkSize: Type.Optional(Type.Number({
      description: "Optional chunk size passed to the SDK writer.",
    })),
    delayInMs: Type.Optional(Type.Number({
      description: "Optional inter-chunk delay in milliseconds.",
    })),
    text: Type.String({
      description: "Text to type into the currently focused target.",
    }),
  });

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseWriteTool.parameters> {
    return {
      description: "Type text into the focused desktop target.",
      execute: async (_toolCallId, params) => {
        await this.toolService.write(params.text, {
          chunkSize: params.chunkSize,
          delayInMs: params.delayInMs,
        });
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              `Typed ${params.text.length} characters.`,
            ),
            type: "text",
          }],
          details: {
            chunkSize: params.chunkSize ?? null,
            delayInMs: params.delayInMs ?? null,
            length: params.text.length,
            type: "computer_use_write",
          },
        };
      },
      label: "computer_write",
      name: "computer_write",
      parameters: AgentComputeE2bComputerUseWriteTool.parameters,
      promptSnippet: "Type text into the desktop environment",
    };
  }
}
