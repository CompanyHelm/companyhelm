import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AgentMcpToolDescriptor } from "./service.ts";

/**
 * Collapses MCP tool responses into transcript-friendly text so PI Mono can reason about remote
 * tool output without depending on the MCP SDK's richer content block rendering directly.
 */
export class AgentMcpResultFormatter {
  static formatCallResult(
    descriptor: AgentMcpToolDescriptor,
    result: CallToolResult,
  ): string {
    const lines = [
      `server: ${descriptor.mcpServerName}`,
      `tool: ${descriptor.toolName}`,
      `status: ${result.isError ? "error" : "ok"}`,
    ];
    const formattedContent = AgentMcpResultFormatter.formatContent(result);
    if (formattedContent) {
      lines.push("content:");
      lines.push(AgentMcpResultFormatter.indentBlock(formattedContent));
    }

    if (result.structuredContent && Object.keys(result.structuredContent).length > 0) {
      lines.push("structuredContent:");
      lines.push(AgentMcpResultFormatter.indentBlock(JSON.stringify(result.structuredContent, null, 2)));
    }

    if (!formattedContent && (!result.structuredContent || Object.keys(result.structuredContent).length === 0)) {
      lines.push("content: (empty)");
    }

    return lines.join("\n");
  }

  private static formatContent(result: CallToolResult): string {
    return result.content
      .map((contentBlock) => AgentMcpResultFormatter.formatContentBlock(contentBlock))
      .filter((value) => value.length > 0)
      .join("\n\n");
  }

  private static formatContentBlock(contentBlock: CallToolResult["content"][number]): string {
    if (contentBlock.type === "text" && typeof contentBlock.text === "string") {
      return contentBlock.text;
    }

    if (contentBlock.type === "image") {
      return `[image content omitted${contentBlock.mimeType ? ` (${contentBlock.mimeType})` : ""}]`;
    }

    if (contentBlock.type === "audio") {
      return `[audio content omitted${contentBlock.mimeType ? ` (${contentBlock.mimeType})` : ""}]`;
    }

    return JSON.stringify(contentBlock, null, 2);
  }

  private static indentBlock(value: string): string {
    return value.split("\n").map((line) => `  ${line}`).join("\n");
  }
}
