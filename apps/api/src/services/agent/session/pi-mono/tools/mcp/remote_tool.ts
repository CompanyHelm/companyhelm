import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { TSchema } from "@sinclair/typebox";
import { AgentMcpResultFormatter } from "./result_formatter.ts";
import type { AgentMcpToolDescriptor } from "./service.ts";
import { AgentMcpToolService } from "./service.ts";

/**
 * Wraps one discovered remote MCP tool as a PI Mono custom tool so the model can call the remote
 * capability through the same function-calling surface it already uses for local CompanyHelm tools.
 */
export class AgentMcpRemoteTool {
  private readonly descriptor: AgentMcpToolDescriptor;
  private readonly toolService: AgentMcpToolService;

  constructor(
    toolService: AgentMcpToolService,
    descriptor: AgentMcpToolDescriptor,
  ) {
    this.toolService = toolService;
    this.descriptor = descriptor;
  }

  createDefinition(): ToolDefinition<TSchema> {
    return {
      description: this.buildDescription(),
      execute: async (_toolCallId, input) => {
        const result = await this.toolService.callTool(this.descriptor, this.normalizeInput(input));
        return {
          content: [{
            text: AgentMcpResultFormatter.formatCallResult(this.descriptor, result),
            type: "text",
          }],
          details: {
            isError: result.isError ?? false,
            mcpServerId: this.descriptor.mcpServerId,
            mcpServerName: this.descriptor.mcpServerName,
            qualifiedToolName: this.descriptor.qualifiedName,
            remoteToolName: this.descriptor.toolName,
          },
        };
      },
      label: `${this.descriptor.mcpServerName} / ${this.descriptor.toolName}`,
      name: this.descriptor.qualifiedName,
      parameters: this.descriptor.inputSchema as unknown as TSchema,
      promptSnippet: `${this.descriptor.qualifiedName} (${this.descriptor.mcpServerName})`,
    };
  }

  private buildDescription(): string {
    const descriptionSuffix = this.descriptor.toolDescription
      ? ` ${this.descriptor.toolDescription}`
      : "";

    return `Call the "${this.descriptor.toolName}" MCP tool exposed by the "${this.descriptor.mcpServerName}" server.${descriptionSuffix}`;
  }

  private normalizeInput(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }
}
