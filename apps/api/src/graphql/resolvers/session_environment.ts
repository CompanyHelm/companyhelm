import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { agents } from "../../db/schema.ts";
import { SessionSkillService } from "../../services/skills/session_service.ts";
import { AgentComputeProviderRegistry } from "../../services/environments/providers/provider_registry.ts";
import type {
  AgentEnvironmentRecord,
  AgentEnvironmentStatus,
} from "../../services/environments/providers/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "../../services/environments/catalog_service.ts";
import { AgentEnvironmentLeaseService } from "../../services/environments/lease_service.ts";
import { AgentEnvironmentSelectionService } from "../../services/environments/selection_service.ts";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import { McpService } from "../../services/mcp/service.ts";
import { SessionReadService } from "../../services/agent/session/read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";

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
  provider: "e2b";
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
  description: string | null;
  e2b: {
    hasApiKey: boolean;
  };
  id: string;
  name: string;
  provider: "e2b";
  updatedAt: string;
};

type GraphqlSessionEnvironmentInfo = {
  activeSkills: GraphqlSkillRecord[];
  agentDefaultComputeProviderDefinition: GraphqlComputeProviderDefinitionRecord | null;
  currentEnvironment: GraphqlEnvironmentRecord | null;
  mcpWarnings: GraphqlSessionMcpWarningRecord[];
};

type GraphqlSessionMcpWarningRecord = {
  errorMessage: string;
  recommendedAction: string;
  serverId: string;
  serverName: string;
  status: "connected" | "error" | "not_connected" | "reauth_required";
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
  private readonly mcpService: McpService;
  private readonly providerRegistry: AgentComputeProviderRegistry;
  private readonly sessionSkillService: SessionSkillService;
  private readonly sessionReadService: SessionReadService;
  private readonly selectionService: AgentEnvironmentSelectionService;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
    @inject(AgentEnvironmentLeaseService) leaseService: AgentEnvironmentLeaseService,
    @inject(McpService) mcpService: McpService,
    @inject(AgentComputeProviderRegistry) providerRegistry: AgentComputeProviderRegistry,
    @inject(SessionSkillService) sessionSkillService: SessionSkillService = new SessionSkillService(),
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
    @inject(AgentEnvironmentSelectionService) selectionService: AgentEnvironmentSelectionService,
  ) {
    this.catalogService = catalogService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.leaseService = leaseService;
    this.mcpService = mcpService;
    this.providerRegistry = providerRegistry;
    this.sessionSkillService = sessionSkillService;
    this.sessionReadService = sessionReadService;
    this.selectionService = selectionService;
  }

  execute = async (
    _root: unknown,
    arguments_: SessionEnvironmentArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSessionEnvironmentInfo> => {
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const companyId = context.authSession.company.id;
    const transactionProvider = context.app_runtime_transaction_provider;
    if (arguments_.sessionId.length === 0) {
      throw new Error("sessionId is required.");
    }

    const sessionRecord = await this.sessionReadService.getSession(
      transactionProvider,
      companyId,
      arguments_.sessionId,
      context.authSession.user.id,
    );
    if (!sessionRecord) {
      throw new Error("Session not found.");
    }

    const session = await this.catalogService.loadSession(
      transactionProvider,
      arguments_.sessionId,
    );
    if (session.companyId !== companyId) {
      throw new Error("Session not found.");
    }

    await this.leaseService.expireElapsedLeases(transactionProvider);

    const agent = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const agentRows = await selectableDatabase
        .select({
          defaultComputeProviderDefinitionId: agents.defaultComputeProviderDefinitionId,
          name: agents.name,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, session.agentId),
        )) as AgentRecord[];

      return agentRows[0] ?? null;
    });
    if (!agent) {
      throw new Error("Agent not found.");
    }

    const existingLease = await this.leaseService.findOpenLeaseForSession(
      transactionProvider,
      session.agentId,
      arguments_.sessionId,
    );
    let currentEnvironment: AgentEnvironmentRecord | null = null;
    if (existingLease) {
      const leasedEnvironment = await this.catalogService.loadEnvironmentById(
        transactionProvider,
        existingLease.environmentId,
      );
      if (leasedEnvironment && await this.canReuseEnvironment(transactionProvider, leasedEnvironment)) {
        currentEnvironment = leasedEnvironment;
      }
    }

    if (!currentEnvironment) {
      currentEnvironment = await this.selectionService.findReusableEnvironmentForAgentSession(
        transactionProvider,
        session.agentId,
        arguments_.sessionId,
      );
    }

    const [
      activeSkills,
      attachedMcpServers,
      currentEnvironmentStatus,
      currentEnvironmentDefinition,
      defaultComputeProviderDefinition,
    ] = await Promise.all([
      this.sessionSkillService.listActiveSkills(
        transactionProvider,
        companyId,
        arguments_.sessionId,
      ),
      this.mcpService.listAgentMcpServers(
        transactionProvider,
        companyId,
        session.agentId,
      ),
      currentEnvironment
        ? this.resolveEnvironmentStatus(transactionProvider, currentEnvironment)
        : Promise.resolve<AgentEnvironmentStatus | null>(null),
      currentEnvironment?.providerDefinitionId
        ? this.computeProviderDefinitionService.loadDefinitionById(
          transactionProvider,
          companyId,
          currentEnvironment.providerDefinitionId,
        )
        : Promise.resolve(null),
      agent.defaultComputeProviderDefinitionId
        ? this.computeProviderDefinitionService.loadDefinitionById(
          transactionProvider,
          companyId,
          agent.defaultComputeProviderDefinitionId,
        )
        : Promise.resolve(null),
    ]);

    return {
      activeSkills: activeSkills.map((skill) => GraphqlSkillPresenter.presentSkill(skill)),
      agentDefaultComputeProviderDefinition: defaultComputeProviderDefinition
        ? {
            companyId: defaultComputeProviderDefinition.companyId,
            createdAt: defaultComputeProviderDefinition.createdAt.toISOString(),
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
      mcpWarnings: attachedMcpServers
        .filter((server) => server.enabled)
        .filter((server): server is typeof server & {
          oauthConnectionStatus: "error" | "reauth_required";
        } => server.oauthConnectionStatus === "error" || server.oauthConnectionStatus === "reauth_required")
        .map((server) => ({
          errorMessage: server.oauthLastError ?? "MCP tool discovery failed.",
          recommendedAction: server.oauthConnectionStatus === "reauth_required"
            ? "Reconnect this MCP server in MCP settings to restore its tools for new chat sessions."
            : "Open MCP settings and review this server's credentials or runtime configuration.",
          serverId: server.id,
          serverName: server.name,
          status: server.oauthConnectionStatus,
        })),
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
