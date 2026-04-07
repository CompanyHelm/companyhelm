import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { agents } from "../../db/schema.ts";
import { AgentComputeProviderRegistry } from "../../services/agent/compute/provider_registry.ts";
import type {
  AgentEnvironmentRecord,
  AgentEnvironmentStatus,
} from "../../services/agent/compute/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "../../services/agent/environment/catalog_service.ts";
import { AgentEnvironmentLeaseService } from "../../services/agent/environment/lease_service.ts";
import { AgentEnvironmentSelectionService } from "../../services/agent/environment/selection_service.ts";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type SessionEnvironmentArguments = {
  sessionId: string;
};

type AgentRecord = {
  defaultComputeProviderDefinitionId: string | null;
  name: string;
};

type GraphqlEnvironmentRecord = {
  agentId: string;
  agentName: string | null;
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
  status: AgentEnvironmentStatus;
  updatedAt: string;
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

type GraphqlSessionEnvironmentInfo = {
  agentDefaultComputeProviderDefinition: GraphqlComputeProviderDefinitionRecord | null;
  currentEnvironment: GraphqlEnvironmentRecord | null;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Reports the current reusable environment for one session without mutating leases or provisioning
 * new compute. The chats header uses it to show the live environment identity separately from the
 * agent's default fallback definition.
 */
@injectable()
export class SessionEnvironmentQueryResolver {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly leaseService: AgentEnvironmentLeaseService;
  private readonly providerRegistry: AgentComputeProviderRegistry;
  private readonly selectionService: AgentEnvironmentSelectionService;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
    @inject(AgentEnvironmentLeaseService) leaseService: AgentEnvironmentLeaseService,
    @inject(AgentComputeProviderRegistry) providerRegistry: AgentComputeProviderRegistry,
    @inject(AgentEnvironmentSelectionService) selectionService: AgentEnvironmentSelectionService,
  ) {
    this.catalogService = catalogService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.leaseService = leaseService;
    this.providerRegistry = providerRegistry;
    this.selectionService = selectionService;
  }

  execute = async (
    _root: unknown,
    arguments_: SessionEnvironmentArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSessionEnvironmentInfo> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.sessionId.length === 0) {
      throw new Error("sessionId is required.");
    }

    const session = await this.catalogService.loadSession(
      context.app_runtime_transaction_provider,
      arguments_.sessionId,
    );
    if (session.companyId !== context.authSession.company.id) {
      throw new Error("Session not found.");
    }

    await this.leaseService.expireElapsedLeases(context.app_runtime_transaction_provider);

    const agent = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const agentRows = await selectableDatabase
        .select({
          defaultComputeProviderDefinitionId: agents.defaultComputeProviderDefinitionId,
          name: agents.name,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, context.authSession.company.id),
          eq(agents.id, session.agentId),
        )) as AgentRecord[];

      return agentRows[0] ?? null;
    });
    if (!agent) {
      throw new Error("Agent not found.");
    }

    const existingLease = await this.leaseService.findOpenLeaseForSession(
      context.app_runtime_transaction_provider,
      session.agentId,
      arguments_.sessionId,
    );
    let currentEnvironment: AgentEnvironmentRecord | null = null;
    if (existingLease) {
      const leasedEnvironment = await this.catalogService.loadEnvironmentById(
        context.app_runtime_transaction_provider,
        existingLease.environmentId,
      );
      if (leasedEnvironment && await this.canReuseEnvironment(context.app_runtime_transaction_provider, leasedEnvironment)) {
        currentEnvironment = leasedEnvironment;
      }
    }

    if (!currentEnvironment) {
      currentEnvironment = await this.selectionService.findReusableEnvironmentForAgentSession(
        context.app_runtime_transaction_provider,
        session.agentId,
        arguments_.sessionId,
      );
    }

    const [currentEnvironmentStatus, currentEnvironmentDefinition, defaultComputeProviderDefinition] = await Promise.all([
      currentEnvironment
        ? this.resolveEnvironmentStatus(context.app_runtime_transaction_provider, currentEnvironment)
        : Promise.resolve<AgentEnvironmentStatus | null>(null),
      currentEnvironment?.providerDefinitionId
        ? this.computeProviderDefinitionService.loadDefinitionById(
          context.app_runtime_transaction_provider,
          context.authSession.company.id,
          currentEnvironment.providerDefinitionId,
        )
        : Promise.resolve(null),
      agent.defaultComputeProviderDefinitionId
        ? this.computeProviderDefinitionService.loadDefinitionById(
          context.app_runtime_transaction_provider,
          context.authSession.company.id,
          agent.defaultComputeProviderDefinitionId,
        )
        : Promise.resolve(null),
    ]);

    return {
      agentDefaultComputeProviderDefinition: defaultComputeProviderDefinition
        ? {
            companyId: defaultComputeProviderDefinition.companyId,
            createdAt: defaultComputeProviderDefinition.createdAt.toISOString(),
            daytona: defaultComputeProviderDefinition.daytona,
            description: defaultComputeProviderDefinition.description,
            e2b: defaultComputeProviderDefinition.e2b,
            id: defaultComputeProviderDefinition.id,
            name: defaultComputeProviderDefinition.name,
            provider: defaultComputeProviderDefinition.provider,
            updatedAt: defaultComputeProviderDefinition.updatedAt.toISOString(),
          }
        : null,
      currentEnvironment: currentEnvironment && currentEnvironmentStatus
        ? {
            agentId: currentEnvironment.agentId,
            agentName: agent.name,
            cpuCount: currentEnvironment.cpuCount,
            createdAt: currentEnvironment.createdAt.toISOString(),
            diskSpaceGb: currentEnvironment.diskSpaceGb,
            displayName: currentEnvironment.displayName,
            id: currentEnvironment.id,
            lastSeenAt: currentEnvironment.lastSeenAt?.toISOString() ?? null,
            memoryGb: currentEnvironment.memoryGb,
            platform: currentEnvironment.platform,
            provider: currentEnvironment.provider,
            providerDefinitionId: currentEnvironment.providerDefinitionId,
            providerDefinitionName: currentEnvironmentDefinition?.name ?? null,
            providerEnvironmentId: currentEnvironment.providerEnvironmentId,
            templateId: currentEnvironment.templateId,
            status: currentEnvironmentStatus,
            updatedAt: currentEnvironment.updatedAt.toISOString(),
          }
        : null,
    };
  };

  private async canReuseEnvironment(
    transactionProvider: GraphqlRequestContext["app_runtime_transaction_provider"],
    environment: AgentEnvironmentRecord,
  ): Promise<boolean> {
    if (!transactionProvider) {
      return false;
    }

    try {
      return await this.providerRegistry
        .get(environment.provider)
        .getEnvironmentStatus(transactionProvider, environment) !== "unhealthy";
    } catch {
      return false;
    }
  }

  private async resolveEnvironmentStatus(
    transactionProvider: GraphqlRequestContext["app_runtime_transaction_provider"],
    environment: AgentEnvironmentRecord,
  ): Promise<AgentEnvironmentStatus> {
    if (!transactionProvider) {
      return "unhealthy";
    }

    try {
      return await this.providerRegistry
        .get(environment.provider)
        .getEnvironmentStatus(transactionProvider, environment);
    } catch {
      return "unhealthy";
    }
  }
}
