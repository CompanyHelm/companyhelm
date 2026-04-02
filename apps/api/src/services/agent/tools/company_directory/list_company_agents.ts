import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentCompanyDirectoryResultFormatter } from "./result_formatter.ts";
import { AgentCompanyDirectoryToolService } from "./service.ts";

/**
 * Lists the company-scoped agent catalog so the current agent can pick concrete target ids for
 * delegation and coordination flows.
 */
export class AgentListCompanyAgentsTool {
  private static readonly parameters = Type.Object({});

  private readonly companyDirectoryToolService: AgentCompanyDirectoryToolService;

  constructor(companyDirectoryToolService: AgentCompanyDirectoryToolService) {
    this.companyDirectoryToolService = companyDirectoryToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListCompanyAgentsTool.parameters> {
    return {
      description: "List the company agents with their ids and names.",
      execute: async () => {
        const agents = await this.companyDirectoryToolService.listCompanyAgents();
        return {
          content: [{
            text: AgentCompanyDirectoryResultFormatter.formatAgents(agents),
            type: "text",
          }],
        };
      },
      label: "list_company_agents",
      name: "list_company_agents",
      parameters: AgentListCompanyAgentsTool.parameters,
      promptGuidelines: [
        "Use list_company_agents before delegation when you need a concrete target agent id.",
      ],
      promptSnippet: "List company agents",
    };
  }
}
