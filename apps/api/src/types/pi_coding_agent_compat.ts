/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type {
  AgentToolResult,
  AgentToolUpdateCallback,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { ImageContent, TextContent } from "@mariozechner/pi-ai";
import type { Static, TSchema } from "typebox";

type LegacyAgentToolResult<TDetails> = {
  content: Array<TextContent | ImageContent>;
  details?: TDetails;
};

declare module "@mariozechner/pi-coding-agent" {
  interface ToolDefinition<TParams extends TSchema = TSchema, TDetails = unknown, TState = any> {
    /**
     * CompanyHelm still has older tests and tool implementations that call execute with only the
     * stable tool call id and params pair. The runtime continues to pass the richer argument set,
     * while this overload preserves source compatibility during the migration.
     */
    execute(toolCallId: string, params: Static<TParams>): Promise<LegacyAgentToolResult<TDetails>>;

    /**
     * Some existing tool implementations only return text/image content and do not yet attach
     * structured details. Keep that legacy result shape assignable while the API migrates.
     */
    execute(
      toolCallId: string,
      params: Static<TParams>,
      signal: AbortSignal | undefined,
      onUpdate: AgentToolUpdateCallback<TDetails> | undefined,
      ctx: ExtensionContext,
    ): Promise<AgentToolResult<TDetails> | LegacyAgentToolResult<TDetails>>;
  }
}

export {};
