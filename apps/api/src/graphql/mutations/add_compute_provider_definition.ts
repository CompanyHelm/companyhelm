import { inject, injectable } from "inversify";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddComputeProviderDefinitionMutationArguments = {
  input: {
    daytona?: {
      apiKey: string;
      apiUrl?: string | null;
    } | null;
    description?: string | null;
    e2b?: {
      apiKey: string;
    } | null;
    name: string;
    provider: string;
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

    const provider = String(arguments_.input.provider || "").trim();
    let definition;
    if (provider === "daytona") {
      if (!arguments_.input.daytona) {
        throw new Error("daytona configuration is required.");
      }

      definition = await this.computeProviderDefinitionService.createDefinition(
        context.app_runtime_transaction_provider,
        {
          companyId: context.authSession.company.id,
          createdByUserId: context.authSession.user.id,
          daytona: {
            apiKey: arguments_.input.daytona.apiKey,
            apiUrl: arguments_.input.daytona.apiUrl,
          },
          description: arguments_.input.description,
          name: arguments_.input.name,
          provider: "daytona",
        },
      );
    } else if (provider === "e2b") {
      if (!arguments_.input.e2b) {
        throw new Error("e2b configuration is required.");
      }

      definition = await this.computeProviderDefinitionService.createDefinition(
        context.app_runtime_transaction_provider,
        {
          companyId: context.authSession.company.id,
          createdByUserId: context.authSession.user.id,
          description: arguments_.input.description,
          e2b: {
            apiKey: arguments_.input.e2b.apiKey,
          },
          name: arguments_.input.name,
          provider: "e2b",
        },
      );
    } else {
      throw new Error("Unsupported compute provider.");
    }

    return {
      companyId: definition.companyId,
      createdAt: definition.createdAt.toISOString(),
      daytona: definition.daytona,
      description: definition.description,
      e2b: definition.e2b,
      id: definition.id,
      name: definition.name,
      provider: definition.provider,
      updatedAt: definition.updatedAt.toISOString(),
    };
  };
}
