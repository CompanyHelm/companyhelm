import { inject, injectable } from "inversify";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateComputeProviderDefinitionMutationArguments = {
  input: {
    description?: string | null;
    e2b?: {
      apiKey?: string | null;
    } | null;
    id: string;
    name: string;
    provider: string;
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
 * Updates one company compute provider definition while keeping its provider type fixed. Provider
 * secrets can be omitted from the input to preserve the currently stored encrypted value.
 */
@injectable()
export class UpdateComputeProviderDefinitionMutation extends Mutation<
  UpdateComputeProviderDefinitionMutationArguments,
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
    arguments_: UpdateComputeProviderDefinitionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlComputeProviderDefinitionRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const definition = await this.computeProviderDefinitionService.updateDefinition(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        definitionId: arguments_.input.id,
        description: arguments_.input.description,
        e2b: {
          apiKey: arguments_.input.e2b?.apiKey,
        },
        name: arguments_.input.name,
        provider: "e2b",
        updatedByUserId: context.authSession.user.id,
      },
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
