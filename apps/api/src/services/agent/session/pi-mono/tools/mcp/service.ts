import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Logger as PinoLogger } from "pino";
import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import { McpRuntimeClient } from "../../../../../mcp/runtime/client.ts";
import { McpService, type McpServerRecord } from "../../../../../mcp/service.ts";

export type AgentMcpToolDescriptor = {
  inputSchema: Record<string, unknown>;
  mcpServerId: string;
  mcpServerName: string;
  mcpServerUrl: string;
  qualifiedName: string;
  toolDescription: string | null;
  toolName: string;
};

/**
 * Discovers which remote MCP tools should be exposed inside one PI Mono session and routes later
 * tool executions back through the same CompanyHelm-scoped MCP server catalog.
 */
export class AgentMcpToolService {
  private readonly companyId: string;
  private readonly agentId: string;
  private readonly logger: PinoLogger;
  private readonly mcpService: McpService;
  private readonly runtimeClient: McpRuntimeClient;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    logger: PinoLogger,
    mcpService: McpService,
    runtimeClient: McpRuntimeClient = new McpRuntimeClient(),
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.agentId = agentId;
    this.logger = logger;
    this.mcpService = mcpService;
    this.runtimeClient = runtimeClient;
  }

  async callTool(
    descriptor: AgentMcpToolDescriptor,
    input: Record<string, unknown>,
  ) {
    try {
      const headers = await this.mcpService.resolveMcpServerRequestHeaders(
        this.transactionProvider,
        {
          companyId: this.companyId,
          mcpServerId: descriptor.mcpServerId,
        },
      );
      const server = await this.mcpService.getMcpServer(
        this.transactionProvider,
        this.companyId,
        descriptor.mcpServerId,
      );

      return await this.runtimeClient.callTool({
        arguments: input,
        callTimeoutMs: server.callTimeoutMs,
        headers,
        toolName: descriptor.toolName,
        url: descriptor.mcpServerUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown MCP tool failure.";
      throw new Error(
        `MCP tool "${descriptor.toolName}" on server "${descriptor.mcpServerName}" failed: ${message}`,
        {
          cause: error,
        },
      );
    }
  }

  async discoverToolDescriptors(): Promise<AgentMcpToolDescriptor[]> {
    const servers = await this.mcpService.listAgentMcpServers(
      this.transactionProvider,
      this.companyId,
      this.agentId,
    );
    const discoveredDescriptors = (await Promise.all(
      servers.filter((server) => server.enabled).map((server) => this.discoverServerTools(server)),
    )).flat();

    return this.qualifyToolNames(discoveredDescriptors);
  }

  private buildDescriptor(
    server: McpServerRecord,
    tool: Tool,
  ): AgentMcpToolDescriptor {
    return {
      inputSchema: tool.inputSchema as Record<string, unknown>,
      mcpServerId: server.id,
      mcpServerName: server.name,
      mcpServerUrl: server.url,
      qualifiedName: "",
      toolDescription: this.normalizeOptionalText(tool.description),
      toolName: tool.name,
    };
  }

  private async discoverServerTools(server: McpServerRecord): Promise<AgentMcpToolDescriptor[]> {
    try {
      const headers = await this.mcpService.resolveMcpServerRequestHeaders(
        this.transactionProvider,
        {
          companyId: this.companyId,
          mcpServerId: server.id,
        },
      );
      const tools = await this.runtimeClient.listTools({
        callTimeoutMs: server.callTimeoutMs,
        headers,
        url: server.url,
      });

      return tools.map((tool) => this.buildDescriptor(server, tool));
    } catch (error) {
      this.logger.warn(
        {
          agentId: this.agentId,
          companyId: this.companyId,
          error: error instanceof Error ? error.message : String(error),
          mcpServerId: server.id,
          mcpServerName: server.name,
        },
        "failed to discover mcp server tools",
      );
      return [];
    }
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private qualifyToolNames(descriptors: AgentMcpToolDescriptor[]): AgentMcpToolDescriptor[] {
    const counts = new Map<string, number>();

    return descriptors.map((descriptor) => {
      const baseName = `${this.sanitizeNameSegment(descriptor.mcpServerName)}__${this.sanitizeNameSegment(descriptor.toolName)}`;
      const nextCount = (counts.get(baseName) ?? 0) + 1;
      counts.set(baseName, nextCount);

      return {
        ...descriptor,
        qualifiedName: nextCount === 1 ? baseName : `${baseName}__${nextCount}`,
      };
    });
  }

  private sanitizeNameSegment(value: string): string {
    const normalizedValue = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "_")
      .replace(/^_+/u, "")
      .replace(/_+$/u, "")
      .replace(/_+/gu, "_");

    if (normalizedValue.length === 0) {
      return "mcp";
    }

    if (/^[0-9]/u.test(normalizedValue)) {
      return `mcp_${normalizedValue}`;
    }

    return normalizedValue;
  }
}
