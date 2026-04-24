import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentCreateAgentTool } from "./create_agent.ts";
import { AgentListAgentsTool } from "./list_agents.ts";
import { AgentManagementToolService } from "./service.ts";
import { AgentUpdateAgentTool } from "./update_agent.ts";

/**
 * Groups the full agent-management toolset behind one provider so PI Mono can inspect and edit the
 * company agent catalog, including the currently running agent, through one coherent surface.
 */
export class AgentManagementToolProvider extends AgentToolProviderInterface {
  private readonly agentManagementToolService: AgentManagementToolService;

  constructor(agentManagementToolService: AgentManagementToolService) {
    super();
    this.agentManagementToolService = agentManagementToolService;
  }

  createToolDefinitions(): unknown[] {
    return [
      new AgentListAgentsTool(this.agentManagementToolService).createDefinition(),
      new AgentCreateAgentTool(this.agentManagementToolService).createDefinition(),
      new AgentUpdateAgentTool(this.agentManagementToolService).createDefinition(),
    ];
  }
}
