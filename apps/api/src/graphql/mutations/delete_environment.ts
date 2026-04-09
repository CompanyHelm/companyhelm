import { inject, injectable } from "inversify";
import { AgentComputeProviderRegistry } from "../../services/environments/providers/provider_registry.ts";
import type { AgentComputeProviderInterface } from "../../services/environments/providers/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "../../services/environments/catalog_service.ts";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteEnvironmentMutationArguments = {
  input: {
    force?: boolean | null;
    id: string;
  };
};

type GraphqlEnvironmentRecord = {
  agentId: string;
  agentName: null;
  cpuCount: number;
  createdAt: string;
  diskSpaceGb: number;
  displayName: string | null;
  id: string;
  lastSeenAt: string | null;
  memoryGb: number;
  platform: "linux" | "macos" | "windows";
  provider: "e2b";
  providerDefinitionId: string | null;
  providerDefinitionName: string | null;
  providerEnvironmentId: string;
  templateId: string;
  status: "deleting";
  updatedAt: string;
};

/**
 * Deletes one company-scoped environment by delegating teardown to the provider that originally
 * created it and then removing the persisted catalog row.
 */
@injectable()
export class DeleteEnvironmentMutation extends Mutation<
  DeleteEnvironmentMutationArguments,
  GraphqlEnvironmentRecord
> {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly providerRegistry: AgentComputeProviderRegistry;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService = new AgentEnvironmentCatalogService(),
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionServiceOrProvider: ComputeProviderDefinitionService | AgentComputeProviderInterface = {
      async loadDefinitionById() {
        throw new Error("Compute provider definition service is not configured.");
      },
    } as never,
    @inject(AgentComputeProviderRegistry) providerRegistry?: AgentComputeProviderRegistry,
  ) {
    super();
    this.catalogService = catalogService;
    if (providerRegistry) {
      this.computeProviderDefinitionService = computeProviderDefinitionServiceOrProvider as ComputeProviderDefinitionService;
      this.providerRegistry = providerRegistry;
      return;
    }

    if (DeleteEnvironmentMutation.isProvider(computeProviderDefinitionServiceOrProvider)) {
      this.computeProviderDefinitionService = {
        async loadDefinitionById() {
          return null;
        },
      } as never;
      this.providerRegistry = {
        get() {
          return computeProviderDefinitionServiceOrProvider;
        },
      } as never;
      return;
    }

    this.computeProviderDefinitionService = computeProviderDefinitionServiceOrProvider;
    this.providerRegistry = {
      get() {
        throw new Error("Compute provider registry is not configured.");
      },
    } as never;
  }

  protected resolve = async (
    arguments_: DeleteEnvironmentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlEnvironmentRecord> => {
    const environmentId = String(arguments_.input.id || "").trim();
    const forceDelete = arguments_.input.force === true;
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

    try {
      await this.providerRegistry
        .get(environment.provider)
        .deleteEnvironment(context.app_runtime_transaction_provider, environment);
    } catch (error) {
      if (!forceDelete) {
        throw error;
      }
    }

    const deletedEnvironment = await this.catalogService.deleteEnvironment(
      context.app_runtime_transaction_provider,
      environment.id,
      context.authSession.company.id,
    );
    if (!deletedEnvironment) {
      throw new Error("Environment not found.");
    }

    const providerDefinition = deletedEnvironment.providerDefinitionId
      ? await this.computeProviderDefinitionService.loadDefinitionById(
        context.app_runtime_transaction_provider,
        context.authSession.company.id,
        deletedEnvironment.providerDefinitionId,
      )
      : null;

    return {
      agentId: deletedEnvironment.agentId,
      agentName: null,
      cpuCount: deletedEnvironment.cpuCount,
      createdAt: deletedEnvironment.createdAt.toISOString(),
      diskSpaceGb: deletedEnvironment.diskSpaceGb,
      displayName: deletedEnvironment.displayName,
      id: deletedEnvironment.id,
      lastSeenAt: deletedEnvironment.lastSeenAt?.toISOString() ?? null,
      memoryGb: deletedEnvironment.memoryGb,
      platform: deletedEnvironment.platform,
      provider: deletedEnvironment.provider,
      providerDefinitionId: deletedEnvironment.providerDefinitionId,
      providerDefinitionName: providerDefinition?.name ?? null,
      providerEnvironmentId: deletedEnvironment.providerEnvironmentId,
      templateId: deletedEnvironment.templateId,
      status: "deleting",
      updatedAt: deletedEnvironment.updatedAt.toISOString(),
    };
  };

  private static isProvider(value: unknown): value is AgentComputeProviderInterface {
    return typeof value === "object"
      && value !== null
      && "getProvider" in value
      && typeof value.getProvider === "function";
  }
}
