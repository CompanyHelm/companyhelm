import { eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { agentEnvironments, agents } from "../../db/schema.ts";
import {
  AgentComputeProviderInterface,
  type AgentEnvironmentStatus,
} from "../../services/agent/compute/provider_interface.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type EnvironmentRecord = {
  agentId: string;
  cpuCount: number;
  createdAt: Date;
  diskSpaceGb: number;
  displayName: string | null;
  id: string;
  lastSeenAt: Date | null;
  memoryGb: number;
  platform: "linux" | "macos" | "windows";
  provider: "daytona";
  providerEnvironmentId: string;
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
  provider: "daytona";
  providerEnvironmentId: string;
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
 * Lists the environments owned by the authenticated company so the web UI can show the current
 * pool of agent-specific compute environments without coupling the client to provider internals.
 */
@injectable()
export class EnvironmentsQueryResolver extends Resolver<GraphqlEnvironmentRecord[]> {
  private readonly provider: AgentComputeProviderInterface;

  constructor(
    @inject(AgentComputeProviderInterface) provider: AgentComputeProviderInterface = {
      async createShell() {
        throw new Error("Environment provider is not configured.");
      },
      async deleteEnvironment() {
        throw new Error("Environment provider is not configured.");
      },
      getEnvironmentStatus: async () => "unhealthy",
      getProvider() {
        return "daytona";
      },
      async provisionEnvironment() {
        throw new Error("Environment provider is not configured.");
      },
      supportsOnDemandProvisioning() {
        return false;
      },
    },
  ) {
    super();
    this.provider = provider;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlEnvironmentRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const environmentRecords = await selectableDatabase
        .select({
          agentId: agentEnvironments.agentId,
          cpuCount: agentEnvironments.cpuCount,
          createdAt: agentEnvironments.createdAt,
          diskSpaceGb: agentEnvironments.diskSpaceGb,
          displayName: agentEnvironments.displayName,
          id: agentEnvironments.id,
          lastSeenAt: agentEnvironments.lastSeenAt,
          memoryGb: agentEnvironments.memoryGb,
          platform: agentEnvironments.platform,
          provider: agentEnvironments.provider,
          providerEnvironmentId: agentEnvironments.providerEnvironmentId,
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
            if (environmentRecord.provider !== this.provider.getProvider()) {
              throw new Error(`Environment provider ${environmentRecord.provider} is not configured.`);
            }

            return [
              environmentRecord.id,
              await this.provider.getEnvironmentStatus(context.app_runtime_transaction_provider, environmentRecord),
            ] as const;
          }),
        ),
      );

      return sortedEnvironmentRecords
        .map((environmentRecord) => EnvironmentsQueryResolver.serializeRecord(
          environmentRecord,
          agentNameById,
          statusesByEnvironmentId.get(environmentRecord.id) ?? "unhealthy",
        ));
    });
  };

  private static serializeRecord(
    environmentRecord: EnvironmentRecord,
    agentNameById: Map<string, string>,
    status: AgentEnvironmentStatus,
  ): GraphqlEnvironmentRecord {
    return {
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
      providerEnvironmentId: environmentRecord.providerEnvironmentId,
      status,
      updatedAt: environmentRecord.updatedAt.toISOString(),
    };
  }
}
