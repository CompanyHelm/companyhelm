import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentManagementResultFormatter } from "./result_formatter.ts";
import { AgentManagementToolService } from "./service.ts";

/**
 * Creates a new company agent using the same persisted configuration model as the product UI. The
 * tool accepts ids from list_agents output so the agent can provision a sibling or replacement
 * agent without leaving the PI Mono workflow.
 */
export class AgentCreateAgentTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    defaultComputeProviderDefinitionId: Type.String({
      description: "Compute provider definition id to use for the new agent by default.",
    }),
    environmentRequirements: Type.Optional(AgentToolParameterSchema.object({
      minCpuCount: Type.Integer({ minimum: 1 }),
      minDiskSpaceGb: Type.Integer({ minimum: 1 }),
      minMemoryGb: Type.Integer({ minimum: 1 }),
    })),
    modelProviderCredentialId: Type.Optional(Type.Union([
      Type.Null(),
      Type.String({
        description: "Optional provider credential id. Omit it to use the credential attached to the selected model.",
      }),
    ])),
    modelProviderCredentialModelId: Type.String({
      description: "Provider model id for the new agent.",
    }),
    name: Type.String({
      description: "Name of the new agent.",
    }),
    reasoningLevel: Type.Optional(Type.Union([
      Type.Null(),
      Type.String({
        description: "Optional reasoning level for the selected model.",
      }),
    ])),
    secretIds: Type.Optional(Type.Union([
      Type.Null(),
      Type.Array(Type.String(), {
        description: "Optional default secret ids to attach to the new agent.",
      }),
    ])),
    systemPrompt: Type.Optional(Type.Union([
      Type.Null(),
      Type.String({
        description: "Optional system prompt override for the new agent.",
      }),
    ])),
  });

  private readonly agentManagementToolService: AgentManagementToolService;

  constructor(agentManagementToolService: AgentManagementToolService) {
    this.agentManagementToolService = agentManagementToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentCreateAgentTool.parameters> {
    return {
      description: "Create a company agent with model, compute provider, environment, and secret defaults.",
      execute: async (_toolCallId, input) => {
        const agent = await this.agentManagementToolService.createAgent(input);
        return {
          content: [{
            text: AgentManagementResultFormatter.formatCreatedAgent(agent),
            type: "text",
          }],
          details: {
            agentId: agent.id,
            type: "agents",
          },
        };
      },
      label: "create_agent",
      name: "create_agent",
      parameters: AgentCreateAgentTool.parameters,
      promptGuidelines: [
        "Use create_agent when you need a new company agent with a distinct model, compute provider, or system prompt.",
        "Call list_agents first if you need the current ids for compute providers, provider credentials, models, or secrets.",
      ],
      promptSnippet: "Create a company agent",
    };
  }
}
