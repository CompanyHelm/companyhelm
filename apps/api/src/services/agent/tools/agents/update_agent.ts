import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentManagementResultFormatter } from "./result_formatter.ts";
import { AgentManagementToolService } from "./service.ts";

/**
 * Updates an existing company agent, including the current agent if needed. Fields are patch-like:
 * omitted properties keep their existing values, while provided values replace the persisted
 * configuration.
 */
export class AgentUpdateAgentTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    defaultComputeProviderDefinitionId: Type.Optional(Type.String({
      description: "Optional replacement compute provider definition id.",
    })),
    defaultEnvironmentTemplateId: Type.Optional(Type.Union([
      Type.Null(),
      Type.String({
        description: "Optional replacement environment template id.",
      }),
    ])),
    id: Type.String({
      description: "Id of the agent to update. This can be the current agent id.",
    }),
    modelProviderCredentialId: Type.Optional(Type.Union([
      Type.Null(),
      Type.String({
        description: "Optional replacement provider credential id.",
      }),
    ])),
    modelProviderCredentialModelId: Type.Optional(Type.String({
      description: "Optional replacement provider model id.",
    })),
    name: Type.Optional(Type.String({
      description: "Optional replacement agent name.",
    })),
    reasoningLevel: Type.Optional(Type.Union([
      Type.Null(),
      Type.String({
        description: "Optional replacement reasoning level for the selected model.",
      }),
    ])),
    secretIds: Type.Optional(Type.Union([
      Type.Null(),
      Type.Array(Type.String(), {
        description: "Optional full replacement list of default secret ids. Pass [] or null to clear them.",
      }),
    ])),
    systemPrompt: Type.Optional(Type.Union([
      Type.Null(),
      Type.String({
        description: "Optional replacement system prompt. Pass null to clear it.",
      }),
    ])),
  });

  private readonly agentManagementToolService: AgentManagementToolService;

  constructor(agentManagementToolService: AgentManagementToolService) {
    this.agentManagementToolService = agentManagementToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentUpdateAgentTool.parameters> {
    return {
      description:
        "Update a company agent, including the current agent, while leaving any omitted fields unchanged.",
      execute: async (_toolCallId, input) => {
        const agent = await this.agentManagementToolService.updateAgent(input);
        return {
          content: [{
            text: AgentManagementResultFormatter.formatUpdatedAgent(agent),
            type: "text",
          }],
          details: {
            agentId: agent.id,
            type: "agents",
          },
        };
      },
      label: "update_agent",
      name: "update_agent",
      parameters: AgentUpdateAgentTool.parameters,
      promptGuidelines: [
        "Use update_agent to edit any persisted agent field, including the current agent's own configuration.",
        "Fields you omit stay unchanged, so only send the properties you intend to replace.",
      ],
      promptSnippet: "Update a company agent",
    };
  }
}
