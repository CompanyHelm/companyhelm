import { inject, injectable } from "inversify";
import type { AgentEnvironmentTemplate } from "../../services/agent/compute/provider_interface.ts";
import { AgentEnvironmentTemplateService } from "../../services/agent/environment/template_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type GraphqlComputeProviderDefinitionRecord = {
  id: string;
  templates?: AgentEnvironmentTemplate[];
};

/**
 * Resolves provider templates only when the nested GraphQL field is selected so pages that only
 * need definition metadata do not trigger template catalog lookups.
 */
@injectable()
export class ComputeProviderDefinitionTemplatesResolver {
  private readonly templateService: AgentEnvironmentTemplateService;

  constructor(
    @inject(AgentEnvironmentTemplateService)
    templateService: AgentEnvironmentTemplateService = {
      async listTemplatesForProvider() {
        return [];
      },
    } as never,
  ) {
    this.templateService = templateService;
  }

  execute = async (
    definition: GraphqlComputeProviderDefinitionRecord,
    _arguments: Record<string, never>,
    context: GraphqlRequestContext,
  ): Promise<AgentEnvironmentTemplate[]> => {
    if (definition.templates) {
      return definition.templates;
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return this.templateService.listTemplatesForProvider(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      definition.id,
    );
  };
}
