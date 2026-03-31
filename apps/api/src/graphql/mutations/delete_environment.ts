import { inject, injectable } from "inversify";
import { AgentComputeProviderInterface } from "../../services/agent/compute/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "../../services/agent/environment/catalog_service.ts";
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
  provider: "daytona";
  providerEnvironmentId: string;
  status: "deleting";
  updatedAt: string;
};

/**
 * Deletes one company-scoped environment by tearing it down at the provider first and then
 * removing the local catalog row so the environment inventory and remote compute stay aligned.
 */
@injectable()
export class DeleteEnvironmentMutation extends Mutation<
  DeleteEnvironmentMutationArguments,
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
    if (environment.provider !== this.provider.getProvider()) {
      throw new Error(`Environment provider ${environment.provider} is not configured.`);
    }

    try {
      await this.provider.deleteEnvironment(context.app_runtime_transaction_provider, environment);
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
      providerEnvironmentId: deletedEnvironment.providerEnvironmentId,
      status: "deleting",
      updatedAt: deletedEnvironment.updatedAt.toISOString(),
    };
  };
}
