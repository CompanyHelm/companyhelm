import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentManagementResultFormatter } from "./result_formatter.ts";
import { AgentManagementToolService } from "./service.ts";

/**
 * Lists the full company agent catalog plus the related option catalogs needed to create or edit
 * agents without bouncing through separate GraphQL-only APIs.
 */
export class AgentListAgentsTool {
  private static readonly parameters = AgentToolParameterSchema.object({});

  private readonly agentManagementToolService: AgentManagementToolService;

  constructor(agentManagementToolService: AgentManagementToolService) {
    this.agentManagementToolService = agentManagementToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListAgentsTool.parameters> {
    return {
      description:
        "List all company agents with their full editable configuration, plus compute provider, model, and secret option catalogs.",
      execute: async () => {
        const snapshot = await this.agentManagementToolService.listAgents();
        return {
          content: [{
            text: AgentManagementResultFormatter.formatSnapshot(snapshot),
            type: "text",
          }],
          details: {
            agentCount: snapshot.agents.length,
            currentAgentId: snapshot.currentAgentId,
            type: "agents",
          },
        };
      },
      label: "list_agents",
      name: "list_agents",
      parameters: AgentListAgentsTool.parameters,
      promptGuidelines: [
        "Use list_agents before create_agent or update_agent when you need concrete ids for models, compute providers, or secrets.",
      ],
      promptSnippet: "List full agent catalog",
    };
  }
}
