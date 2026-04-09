import { inject, injectable } from "inversify";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddComputeProviderDefinitionMutationArguments = {
  input: {
    description?: string | null;
    e2b?: {
      apiKey: string;
    } | null;
    isDefault?: boolean | null;
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
 * Creates one company-scoped compute provider definition with typed provider-specific configuration
 * so agents can use it as their default environment backend.
 */
@injectable()
export class AddComputeProviderDefinitionMutation extends Mutation<
  AddComputeProviderDefinitionMutationArguments,
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
    arguments_: AddComputeProviderDefinitionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlComputeProviderDefinitionRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    if (!arguments_.input.e2b) {
      throw new Error("e2b configuration is required.");
    }

    const definition = await this.computeProviderDefinitionService.createDefinition(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        createdByUserId: context.authSession.user.id,
        description: arguments_.input.description,
        e2b: {
          apiKey: arguments_.input.e2b.apiKey,
        },
        isDefault: arguments_.input.isDefault,
        name: arguments_.input.name,
        provider: "e2b",
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
