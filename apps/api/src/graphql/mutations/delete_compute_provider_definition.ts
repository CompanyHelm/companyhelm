import { inject, injectable } from "inversify";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteComputeProviderDefinitionMutationArguments = {
  input: {
    id: string;
  };
};

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
  name: string;
  provider: "daytona" | "e2b";
  updatedAt: string;
};

/**
 * Deletes one company-scoped compute provider definition after ensuring it is no longer referenced
 * by any agents or persisted environments.
 */
@injectable()
export class DeleteComputeProviderDefinitionMutation extends Mutation<
  DeleteComputeProviderDefinitionMutationArguments,
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
    arguments_: DeleteComputeProviderDefinitionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlComputeProviderDefinitionRecord> => {
    const definitionId = String(arguments_.input.id || "").trim();
    if (definitionId.length === 0) {
      throw new Error("id is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const deletedDefinition = await this.computeProviderDefinitionService.deleteDefinition(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      definitionId,
    );
    if (!deletedDefinition) {
      throw new Error("Compute provider definition not found.");
    }

    return {
      companyId: deletedDefinition.companyId,
      createdAt: deletedDefinition.createdAt.toISOString(),
      daytona: deletedDefinition.daytona,
      description: deletedDefinition.description,
      e2b: deletedDefinition.e2b,
      id: deletedDefinition.id,
      name: deletedDefinition.name,
      provider: deletedDefinition.provider,
      updatedAt: deletedDefinition.updatedAt.toISOString(),
    };
  };
}
