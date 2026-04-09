import { inject, injectable } from "inversify";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type GraphqlComputeProviderDefinitionRecord = {
  companyId: string;
  createdAt: string;
  description: string | null;
  e2b: {
    hasApiKey: boolean;
  };
  id: string;
  isDefault: boolean;
  name: string;
  provider: "e2b";
  updatedAt: string;
};

/**
 * Lists the company-scoped compute provider definitions so the web UI can configure environment
 * backends and agents can choose their default provisioning target.
 */
@injectable()
export class ComputeProviderDefinitionsQueryResolver extends Resolver<GraphqlComputeProviderDefinitionRecord[]> {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;

  constructor(
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
  ) {
    super();
    this.computeProviderDefinitionService = computeProviderDefinitionService;
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

    return definitions.map((definition) => ({
      companyId: definition.companyId,
      createdAt: definition.createdAt.toISOString(),
      description: definition.description,
      e2b: definition.e2b,
      id: definition.id,
      isDefault: definition.isDefault,
      name: definition.name,
      provider: definition.provider,
      updatedAt: definition.updatedAt.toISOString(),
    }));
  };
}
