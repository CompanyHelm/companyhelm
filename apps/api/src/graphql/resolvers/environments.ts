import { eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { agentEnvironments, agents } from "../../db/schema.ts";
import { AgentComputeProviderRegistry } from "../../services/agent/compute/provider_registry.ts";
import type {
  AgentComputeProviderInterface,
  AgentEnvironmentStatus,
} from "../../services/agent/compute/provider_interface.ts";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type EnvironmentRecord = {
  agentId: string;
  companyId: string;
  cpuCount: number;
  createdAt: Date;
  diskSpaceGb: number;
  displayName: string | null;
  id: string;
  lastSeenAt: Date | null;
  memoryGb: number;
  platform: "linux" | "macos" | "windows";
  provider: "daytona" | "e2b";
  providerDefinitionId: string | null;
  providerEnvironmentId: string;
  templateId: string;
  updatedAt: Date;
};

type AgentRecord = {
  id: string;
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

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Lists the environments owned by the authenticated company so the UI can inspect the provider,
 * backing definition, and live status of each reusable compute environment in one place.
 */
@injectable()
export class EnvironmentsQueryResolver extends Resolver<GraphqlEnvironmentRecord[]> {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly providerRegistry: AgentComputeProviderRegistry;

  constructor(
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionServiceOrProvider: ComputeProviderDefinitionService | AgentComputeProviderInterface = {
      async listDefinitions() {
        return [];
      },
    } as never,
    @inject(AgentComputeProviderRegistry) providerRegistry?: AgentComputeProviderRegistry,
  ) {
    super();
    if (providerRegistry) {
      this.computeProviderDefinitionService = computeProviderDefinitionServiceOrProvider as ComputeProviderDefinitionService;
      this.providerRegistry = providerRegistry;
      return;
    }

    if (EnvironmentsQueryResolver.isProvider(computeProviderDefinitionServiceOrProvider)) {
      this.computeProviderDefinitionService = {
        async listDefinitions() {
          return [];
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

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlEnvironmentRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const providerDefinitions = await this.computeProviderDefinitionService.listDefinitions(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );
    const providerDefinitionNameById = new Map(
      providerDefinitions.map((definition) => [definition.id, definition.name]),
    );

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const environmentRecords = await selectableDatabase
        .select({
          agentId: agentEnvironments.agentId,
          companyId: agentEnvironments.companyId,
          cpuCount: agentEnvironments.cpuCount,
          createdAt: agentEnvironments.createdAt,
          diskSpaceGb: agentEnvironments.diskSpaceGb,
          displayName: agentEnvironments.displayName,
          id: agentEnvironments.id,
          lastSeenAt: agentEnvironments.lastSeenAt,
          memoryGb: agentEnvironments.memoryGb,
          platform: agentEnvironments.platform,
          provider: agentEnvironments.provider,
          providerDefinitionId: agentEnvironments.providerDefinitionId,
          providerEnvironmentId: agentEnvironments.providerEnvironmentId,
          templateId: agentEnvironments.templateId,
          updatedAt: agentEnvironments.updatedAt,
        })
        .from(agentEnvironments)
        .where(eq(agentEnvironments.companyId, context.authSession.company.id)) as EnvironmentRecord[];

      const agentIds = [...new Set(environmentRecords.map((environmentRecord) => environmentRecord.agentId))];
      const agentRecords = agentIds.length === 0
        ? []
        : await selectableDatabase
          .select({
            id: agents.id,
            name: agents.name,
          })
          .from(agents)
          .where(inArray(agents.id, agentIds)) as AgentRecord[];
      const agentNameById = new Map(agentRecords.map((agentRecord) => [agentRecord.id, agentRecord.name]));

      const sortedEnvironmentRecords = [...environmentRecords]
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
      const statusesByEnvironmentId = new Map(
        await Promise.all(
          sortedEnvironmentRecords.map(async (environmentRecord) => {
            try {
              return [
                environmentRecord.id,
                await this.providerRegistry
                  .get(environmentRecord.provider)
                  .getEnvironmentStatus(context.app_runtime_transaction_provider, environmentRecord),
              ] as const;
            } catch {
              return [environmentRecord.id, "unhealthy"] as const;
            }
          }),
        ),
      );

      return sortedEnvironmentRecords
        .map((environmentRecord) => ({
          agentId: environmentRecord.agentId,
          agentName: agentNameById.get(environmentRecord.agentId) ?? null,
          cpuCount: environmentRecord.cpuCount,
          createdAt: environmentRecord.createdAt.toISOString(),
          diskSpaceGb: environmentRecord.diskSpaceGb,
          displayName: environmentRecord.displayName,
          id: environmentRecord.id,
          lastSeenAt: environmentRecord.lastSeenAt?.toISOString() ?? null,
          memoryGb: environmentRecord.memoryGb,
          platform: environmentRecord.platform,
          provider: environmentRecord.provider,
          providerDefinitionId: environmentRecord.providerDefinitionId,
          providerDefinitionName: environmentRecord.providerDefinitionId
            ? providerDefinitionNameById.get(environmentRecord.providerDefinitionId) ?? null
            : null,
          providerEnvironmentId: environmentRecord.providerEnvironmentId,
          templateId: environmentRecord.templateId,
          status: statusesByEnvironmentId.get(environmentRecord.id) ?? "unhealthy",
          updatedAt: environmentRecord.updatedAt.toISOString(),
        }));
    });
  };

  private static isProvider(value: unknown): value is AgentComputeProviderInterface {
    return typeof value === "object"
      && value !== null
      && "getProvider" in value
      && typeof value.getProvider === "function";
  }
}
