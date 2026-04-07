import { inject, injectable } from "inversify";
import type { AgentEnvironmentTemplate } from "../../services/agent/compute/provider_interface.ts";
import { AgentEnvironmentTemplateService } from "../../services/agent/environment/template_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type GraphqlAgentRecord = {
  defaultComputeProviderDefinitionId: string | null;
  defaultEnvironmentTemplateId: string;
  environmentTemplate?: AgentEnvironmentTemplate;
};

/**
 * Resolves the selected environment template for one agent only when GraphQL asks for the field.
 * This keeps broad agent queries database-backed and avoids provider API calls on unrelated pages.
 */
@injectable()
export class AgentEnvironmentTemplateResolver {
  private readonly templateService: AgentEnvironmentTemplateService;

  constructor(
    @inject(AgentEnvironmentTemplateService)
    templateService: AgentEnvironmentTemplateService = {
      async resolveTemplateForProvider(_transactionProvider, input) {
        return {
          computerUse: true,
          cpuCount: 4,
          diskSpaceGb: 10,
          memoryGb: 8,
          name: "Desktop",
          templateId: input.templateId,
        };
      },
    } as never,
  ) {
    this.templateService = templateService;
  }

  execute = async (
    agent: GraphqlAgentRecord,
    _arguments: Record<string, never>,
    context: GraphqlRequestContext,
  ): Promise<AgentEnvironmentTemplate> => {
    if (agent.environmentTemplate) {
      return agent.environmentTemplate;
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (!agent.defaultComputeProviderDefinitionId) {
      throw new Error("Agent environment provider is required.");
    }

    return this.templateService.resolveTemplateForProvider(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      providerDefinitionId: agent.defaultComputeProviderDefinitionId,
      templateId: agent.defaultEnvironmentTemplateId,
    });
  };
}
