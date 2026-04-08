import { inject, injectable } from "inversify";
import { AgentComputeProviderRegistry } from "../../services/agent/compute/provider_registry.ts";
import type { AgentComputeProviderInterface } from "../../services/agent/compute/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "../../services/agent/environment/catalog_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type GetEnvironmentVncUrlMutationArguments = {
  input: {
    id: string;
  };
};

type GraphqlEnvironmentVncUrlRecord = {
  environmentId: string;
  url: string;
};

/**
 * Lazily starts desktop streaming for one environment only when an operator explicitly asks for
 * it, which keeps the environments page from doing one expensive provider call per listed row.
 */
@injectable()
export class GetEnvironmentVncUrlMutation extends Mutation<
  GetEnvironmentVncUrlMutationArguments,
  GraphqlEnvironmentVncUrlRecord
> {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly providerRegistry: AgentComputeProviderRegistry;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService = new AgentEnvironmentCatalogService(),
    @inject(AgentComputeProviderRegistry)
    providerRegistryOrProvider: AgentComputeProviderRegistry | AgentComputeProviderInterface = {
      getProvider() {
        throw new Error("Compute provider registry is not configured.");
      },
    } as never,
  ) {
    super();
    this.catalogService = catalogService;
    if (GetEnvironmentVncUrlMutation.isProvider(providerRegistryOrProvider)) {
      this.providerRegistry = {
        get() {
          return providerRegistryOrProvider;
        },
      } as never;
      return;
    }

    this.providerRegistry = providerRegistryOrProvider;
  }

  protected resolve = async (
    arguments_: GetEnvironmentVncUrlMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlEnvironmentVncUrlRecord> => {
    const environmentId = String(arguments_.input.id || "").trim();
    if (environmentId.length === 0) {
      throw new Error("id is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const environment = await this.catalogService.loadEnvironmentById(
      context.app_runtime_transaction_provider,
      environmentId,
    );
    if (!environment || environment.companyId !== context.authSession.company.id) {
      throw new Error("Environment not found.");
    }

    return {
      environmentId: environment.id,
      url: await this.providerRegistry
        .get(environment.provider)
        .getVncUrl(context.app_runtime_transaction_provider, environment),
    };
  };

  private static isProvider(value: unknown): value is AgentComputeProviderInterface {
    return typeof value === "object"
      && value !== null
      && "getProvider" in value
      && typeof value.getProvider === "function";
  }
}
