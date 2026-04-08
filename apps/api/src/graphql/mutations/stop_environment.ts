import { inject, injectable } from "inversify";
import { AgentComputeProviderRegistry } from "../../services/environments/providers/provider_registry.ts";
import type { AgentComputeProviderInterface } from "../../services/environments/providers/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "../../services/environments/catalog_service.ts";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type StopEnvironmentMutationArguments = {
  input: {
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
  provider: "daytona" | "e2b";
  providerDefinitionId: string | null;
  providerDefinitionName: string | null;
  providerEnvironmentId: string;
  templateId: string;
  status: "stopped";
  updatedAt: string;
};

/**
 * Stops one company-scoped environment through its owning provider definition so compute can be
 * released while keeping the persisted environment available for future reuse.
 */
@injectable()
export class StopEnvironmentMutation extends Mutation<
  StopEnvironmentMutationArguments,
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

    if (StopEnvironmentMutation.isProvider(computeProviderDefinitionServiceOrProvider)) {
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
    arguments_: StopEnvironmentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlEnvironmentRecord> => {
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

    await this.providerRegistry
      .get(environment.provider)
      .stopEnvironment(context.app_runtime_transaction_provider, environment);

    const providerDefinition = environment.providerDefinitionId
      ? await this.computeProviderDefinitionService.loadDefinitionById(
        context.app_runtime_transaction_provider,
        context.authSession.company.id,
        environment.providerDefinitionId,
      )
      : null;

    return {
      agentId: environment.agentId,
      agentName: null,
      cpuCount: environment.cpuCount,
      createdAt: environment.createdAt.toISOString(),
      diskSpaceGb: environment.diskSpaceGb,
      displayName: environment.displayName,
      id: environment.id,
      lastSeenAt: environment.lastSeenAt?.toISOString() ?? null,
      memoryGb: environment.memoryGb,
      platform: environment.platform,
      provider: environment.provider,
      providerDefinitionId: environment.providerDefinitionId,
      providerDefinitionName: providerDefinition?.name ?? null,
      providerEnvironmentId: environment.providerEnvironmentId,
      templateId: environment.templateId,
      status: "stopped",
      updatedAt: environment.updatedAt.toISOString(),
    };
  };

  private static isProvider(value: unknown): value is AgentComputeProviderInterface {
    return typeof value === "object"
      && value !== null
      && "getProvider" in value
      && typeof value.getProvider === "function";
  }
}
