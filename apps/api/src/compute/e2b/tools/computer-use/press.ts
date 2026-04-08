import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Sends one keyboard key or a chord of keys through the E2B desktop SDK.
 */
export class AgentComputeE2bComputerUsePressTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    key: Type.Optional(Type.String({
      description: "Single key to press, for example enter, tab, or Meta.",
    })),
    keys: Type.Optional(Type.Array(Type.String(), {
      description: "Optional key chord to press together, for example [\"Meta\", \"l\"].",
    })),
  });

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUsePressTool.parameters> {
    return {
      description: "Press one key or a key chord inside the desktop environment.",
      execute: async (_toolCallId, params) => {
        const keys = this.resolveKeys(params);
        await this.toolService.press(keys.length === 1 ? keys[0] : keys);
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatAction(
              `Pressed ${keys.join(" + ")}.`,
            ),
            type: "text",
          }],
          details: {
            keys,
            type: "computer_use_press",
          },
        };
      },
      label: "computer_press",
      name: "computer_press",
      parameters: AgentComputeE2bComputerUsePressTool.parameters,
      promptGuidelines: [
        "Provide either key for a single key press or keys for a key chord.",
        "Use the keys array for modifier combinations such as Meta + L.",
      ],
      promptSnippet: "Press keys in the desktop environment",
    };
  }

  private resolveKeys(params: { key?: string; keys?: string[] }): string[] {
    if (params.key && params.keys) {
      throw new Error("Provide either key or keys, not both.");
    }

    if (params.key) {
      return [params.key];
    }

    if (params.keys && params.keys.length > 0) {
      return params.keys;
    }

    throw new Error("Either key or keys is required.");
  }
}
