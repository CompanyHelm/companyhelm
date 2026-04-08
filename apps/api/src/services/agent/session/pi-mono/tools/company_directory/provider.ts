import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentListCompanyAgentsTool } from "./list_company_agents.ts";
import { AgentListCompanyMembersTool } from "./list_company_members.ts";
import { AgentCompanyDirectoryToolService } from "./service.ts";

/**
 * Groups the company directory tools so the PI Mono tool catalog can expose company people and
 * agents without the session bootstrap knowing each concrete tool implementation.
 */
export class AgentCompanyDirectoryToolProvider extends AgentToolProviderInterface {
  private readonly companyDirectoryToolService: AgentCompanyDirectoryToolService;

  constructor(companyDirectoryToolService: AgentCompanyDirectoryToolService) {
    super();
    this.companyDirectoryToolService = companyDirectoryToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentListCompanyMembersTool(this.companyDirectoryToolService).createDefinition(),
      new AgentListCompanyAgentsTool(this.companyDirectoryToolService).createDefinition(),
    ];
  }
}
