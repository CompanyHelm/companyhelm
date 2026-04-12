import type { Logger as PinoLogger } from "pino";
import { McpService } from "../../../../mcp/service.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentMcpToolProvider } from "../tools/mcp/provider.ts";
import { AgentMcpToolService } from "../tools/mcp/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Discovers the enabled MCP servers attached to the current agent and exposes the remote tool
 * catalogs they publish as first-class PI Mono tools for newly created sessions.
 */
export class McpSessionModule extends AgentSessionModuleInterface {
  private readonly logger: PinoLogger;
  private readonly mcpService: McpService;

  constructor(logger: PinoLogger, mcpService: McpService) {
    super();
    this.logger = logger;
    this.mcpService = mcpService;
  }

  getName(): string {
    return "mcp";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    const toolService = new AgentMcpToolService(
      context.transactionProvider,
      context.companyId,
      context.agentId,
      this.logger.child({
        agentId: context.agentId,
        component: "agent_mcp_tool_service",
        sessionId: context.sessionId,
      }),
      this.mcpService,
    );
    const descriptors = await toolService.discoverToolDescriptors();
    if (descriptors.length === 0) {
      return [];
    }

    return [
      new AgentMcpToolProvider(toolService, descriptors),
    ];
  }

  async shouldApply(context: AgentSessionBootstrapContext): Promise<boolean> {
    const servers = await this.mcpService.listAgentMcpServers(
      context.transactionProvider,
      context.companyId,
      context.agentId,
    );

    return servers.some((server) => server.enabled);
  }
}
