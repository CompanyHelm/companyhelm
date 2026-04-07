import { inject, injectable } from "inversify";
import type { AgentEnvironmentTemplate } from "../../services/agent/compute/provider_interface.ts";
import { AgentEnvironmentTemplateService } from "../../services/agent/environment/template_service.ts";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type GraphqlComputeProviderDefinitionRecord = {
  companyId: string;
  createdAt: string;
  daytona: {
    apiUrl: string;
  } | null;
  description: string | null;
  e2b: {
    hasApiKey: boolean;
  } | null;
  id: string;
  isDefault: boolean;
  name: string;
  provider: "daytona" | "e2b";
  templates: AgentEnvironmentTemplate[];
  updatedAt: string;
};

/**
 * Lists the company-scoped compute provider definitions so the web UI can configure environment
 * backends and agents can choose their default provisioning target.
 */
@injectable()
export class ComputeProviderDefinitionsQueryResolver extends Resolver<GraphqlComputeProviderDefinitionRecord[]> {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly templateService: AgentEnvironmentTemplateService;

  constructor(
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
    @inject(AgentEnvironmentTemplateService)
    templateService: AgentEnvironmentTemplateService = {
      async listTemplatesForProvider() {
        return [];
      },
    } as never,
  ) {
    super();
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.templateService = templateService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlComputeProviderDefinitionRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const definitions = await this.computeProviderDefinitionService.listDefinitions(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );

    const templatesByDefinitionId = new Map(
      await Promise.all(definitions.map(async (definition) => {
        const templates = await this.templateService.listTemplatesForProvider(
          context.app_runtime_transaction_provider!,
          context.authSession.company.id,
          definition.id,
        );
        return [definition.id, templates] as const;
      })),
    );

    return definitions.map((definition) => ({
      companyId: definition.companyId,
      createdAt: definition.createdAt.toISOString(),
      daytona: definition.daytona,
      description: definition.description,
      e2b: definition.e2b,
      id: definition.id,
      isDefault: definition.isDefault,
      name: definition.name,
      provider: definition.provider,
      templates: templatesByDefinitionId.get(definition.id) ?? [],
      updatedAt: definition.updatedAt.toISOString(),
    }));
  };
}
