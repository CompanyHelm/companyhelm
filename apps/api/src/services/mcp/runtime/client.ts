import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolResultSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { injectable } from "inversify";

/**
 * Wraps the official MCP TypeScript client so CompanyHelm code can discover remote tool catalogs
 * and execute tool calls without duplicating transport wiring, header injection, or timeout logic.
 */
@injectable()
export class McpRuntimeClient {
  private static readonly CLIENT_NAME = "companyhelm-ng";
  private static readonly CLIENT_VERSION = "0.1.0";

  async callTool(input: {
    arguments: Record<string, unknown>;
    callTimeoutMs: number;
    headers: Record<string, string>;
    toolName: string;
    url: string;
  }): Promise<CallToolResult> {
    return this.withConnectedClient(input, async (client) => {
      const result = await client.callTool(
        {
          arguments: input.arguments,
          name: input.toolName,
        },
        CallToolResultSchema,
      );
      return result as CallToolResult;
    });
  }

  async listTools(input: {
    callTimeoutMs: number;
    headers: Record<string, string>;
    url: string;
  }): Promise<Tool[]> {
    return this.withConnectedClient(input, async (client) => {
      const result = await client.listTools();
      return result.tools;
    });
  }

  private async closeTransport(
    transport: StreamableHTTPClientTransport,
  ): Promise<void> {
    try {
      await transport.close();
    } catch {
      // Preserve the original MCP request failure if transport shutdown also fails.
    }
  }

  private createTimedFetch(callTimeoutMs: number): typeof fetch {
    return async (resource: string | URL | Request, init?: RequestInit) => {
      const timeoutController = new AbortController();
      const timeoutHandle = setTimeout(() => {
        timeoutController.abort();
      }, callTimeoutMs);
      const signal = this.mergeAbortSignals(init?.signal, timeoutController.signal);

      try {
        return await fetch(resource, {
          ...init,
          signal,
        });
      } catch (error) {
        if (timeoutController.signal.aborted) {
          throw new Error(`MCP request timed out after ${callTimeoutMs}ms.`, {
            cause: error,
          });
        }

        throw error;
      } finally {
        clearTimeout(timeoutHandle);
      }
    };
  }

  private mergeAbortSignals(
    leftSignal: AbortSignal | null | undefined,
    rightSignal: AbortSignal | null | undefined,
  ): AbortSignal | undefined {
    if (leftSignal && rightSignal) {
      return AbortSignal.any([leftSignal, rightSignal]);
    }

    return leftSignal ?? rightSignal ?? undefined;
  }

  private async withConnectedClient<TResult>(
    input: {
      callTimeoutMs: number;
      headers: Record<string, string>;
      url: string;
    },
    operation: (client: Client) => Promise<TResult>,
  ): Promise<TResult> {
    const client = new Client({
      name: McpRuntimeClient.CLIENT_NAME,
      version: McpRuntimeClient.CLIENT_VERSION,
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(input.url),
      {
        fetch: this.createTimedFetch(input.callTimeoutMs),
        requestInit: {
          headers: input.headers,
        },
      },
    );

    try {
      await client.connect(transport);
      return await operation(client);
    } finally {
      await this.closeTransport(transport);
    }
  }
}
