import { inject, injectable } from "inversify";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type SetDefaultComputeProviderDefinitionMutationArguments = {
  input: {
    id: string;
  };
};

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
 * Promotes one company compute provider definition to the singleton default used by new agents.
 */
@injectable()
export class SetDefaultComputeProviderDefinitionMutation extends Mutation<
  SetDefaultComputeProviderDefinitionMutationArguments,
  GraphqlComputeProviderDefinitionRecord
> {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;

  constructor(
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
  ) {
    super();
    this.computeProviderDefinitionService = computeProviderDefinitionService;
  }

  protected resolve = async (
    arguments_: SetDefaultComputeProviderDefinitionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlComputeProviderDefinitionRecord> => {
    const definitionId = String(arguments_.input.id || "").trim();
    if (!definitionId) {
      throw new Error("id is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const definition = await this.computeProviderDefinitionService.setDefaultDefinition(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      definitionId,
    );

    return {
      companyId: definition.companyId,
      createdAt: definition.createdAt.toISOString(),
      description: definition.description,
      e2b: definition.e2b,
      id: definition.id,
      isDefault: definition.isDefault,
      name: definition.name,
      provider: definition.provider,
      updatedAt: definition.updatedAt.toISOString(),
    };
  };
}
