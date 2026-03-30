import { inject, injectable } from "inversify";
import { AgentComputeProviderInterface } from "../../services/agent/compute/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "../../services/agent/environment/catalog_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type StartEnvironmentMutationArguments = {
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
  provider: "daytona";
  providerEnvironmentId: string;
  status: "running";
  updatedAt: string;
};

/**
 * Starts one company-scoped environment through the configured provider so the inventory can bring
 * a stopped sandbox back online without requiring the chat/session flow to touch it first.
 */
@injectable()
export class StartEnvironmentMutation extends Mutation<
  StartEnvironmentMutationArguments,
  GraphqlEnvironmentRecord
> {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly provider: AgentComputeProviderInterface;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService = new AgentEnvironmentCatalogService(),
    @inject(AgentComputeProviderInterface) provider: AgentComputeProviderInterface = {
      async createShell() {
        throw new Error("Environment provider is not configured.");
      },
      async deleteEnvironment() {
        throw new Error("Environment provider is not configured.");
      },
      async getEnvironmentStatus() {
        return "unhealthy";
      },
      getProvider() {
        return "daytona";
      },
      async provisionEnvironment() {
        throw new Error("Environment provider is not configured.");
      },
      supportsOnDemandProvisioning() {
        return false;
      },
      async startEnvironment() {
        throw new Error("Environment provider is not configured.");
      },
      async stopEnvironment() {
        throw new Error("Environment provider is not configured.");
      },
    },
  ) {
    super();
    this.catalogService = catalogService;
    this.provider = provider;
  }

  protected resolve = async (
    arguments_: StartEnvironmentMutationArguments,
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
    if (environment.provider !== this.provider.getProvider()) {
      throw new Error(`Environment provider ${environment.provider} is not configured.`);
    }

    await this.provider.startEnvironment(context.app_runtime_transaction_provider, environment);

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
      providerEnvironmentId: environment.providerEnvironmentId,
      status: "running",
      updatedAt: environment.updatedAt.toISOString(),
    };
  };
}
