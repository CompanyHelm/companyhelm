import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { agentEnvironments, agentSessions } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import type { AgentEnvironmentRecord } from "../compute/provider_interface.ts";

type SessionRow = {
  agentId: string;
  companyId: string;
  id: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

/**
 * Owns the durable environment records that back lease selection. It keeps raw environment rows
 * separate from lease history so orchestration services can reason about provider state without
 * overloading the environment table with transient lease ownership.
 */
@injectable()
export class AgentEnvironmentCatalogService {
  async createEnvironment(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      cpuCount: number;
      diskSpaceGb: number;
      displayName?: string | null;
      memoryGb: number;
      metadata: Record<string, unknown>;
      platform: "linux" | "macos" | "windows";
      provider: "daytona";
      providerEnvironmentId: string;
    },
  ): Promise<AgentEnvironmentRecord> {
    const now = new Date();
    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const [environment] = await insertableDatabase
        .insert(agentEnvironments)
        .values({
          agentId: input.agentId,
          companyId: input.companyId,
          cpuCount: input.cpuCount,
          createdAt: now,
          diskSpaceGb: input.diskSpaceGb,
          displayName: input.displayName ?? null,
          memoryGb: input.memoryGb,
          metadata: input.metadata,
          platform: input.platform,
          provider: input.provider,
          providerEnvironmentId: input.providerEnvironmentId,
          updatedAt: now,
        })
        .returning?.(this.environmentSelection()) as AgentEnvironmentRecord[];
      if (!environment) {
        throw new Error("Failed to create the agent environment.");
      }

      return environment;
    });
  }

  async loadEnvironmentById(
    transactionProvider: TransactionProviderInterface,
    environmentId: string,
  ): Promise<AgentEnvironmentRecord | null> {
    const environments = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select(this.environmentSelection())
        .from(agentEnvironments)
        .where(eq(agentEnvironments.id, environmentId)) as Promise<AgentEnvironmentRecord[]>;
    });

    return environments[0] ?? null;
  }

  async loadEnvironmentsByIds(
    transactionProvider: TransactionProviderInterface,
    environmentIds: string[],
  ): Promise<AgentEnvironmentRecord[]> {
    if (environmentIds.length === 0) {
      return [];
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select(this.environmentSelection())
        .from(agentEnvironments)
        .where(inArray(agentEnvironments.id, environmentIds)) as Promise<AgentEnvironmentRecord[]>;
    });
  }

  async loadSession(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
  ): Promise<SessionRow> {
    const sessions = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          companyId: agentSessions.companyId,
          id: agentSessions.id,
        })
        .from(agentSessions)
        .where(eq(agentSessions.id, sessionId)) as Promise<SessionRow[]>;
    });
    const session = sessions[0];
    if (!session) {
      throw new Error("Session not found.");
    }

    return session;
  }

  async listAgentEnvironments(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    provider: "daytona",
  ): Promise<AgentEnvironmentRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select(this.environmentSelection())
        .from(agentEnvironments)
        .where(and(
          eq(agentEnvironments.agentId, agentId),
          eq(agentEnvironments.provider, provider),
        )) as Promise<AgentEnvironmentRecord[]>;
    });
  }

  async updateEnvironmentResources(
    transactionProvider: TransactionProviderInterface,
    environmentId: string,
    input: {
      cpuCount: number;
      diskSpaceGb: number;
      memoryGb: number;
      metadata: Record<string, unknown>;
    },
  ): Promise<AgentEnvironmentRecord> {
    const now = new Date();
    return transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const [environment] = await updatableDatabase
        .update(agentEnvironments)
        .set({
          cpuCount: input.cpuCount,
          diskSpaceGb: input.diskSpaceGb,
          lastSeenAt: now,
          memoryGb: input.memoryGb,
          metadata: input.metadata,
          updatedAt: now,
        })
        .where(eq(agentEnvironments.id, environmentId))
        .returning?.(this.environmentSelection()) as AgentEnvironmentRecord[];
      if (!environment) {
        throw new Error("Failed to update the agent environment.");
      }

      return environment;
    });
  }

  private environmentSelection() {
    return {
      agentId: agentEnvironments.agentId,
      companyId: agentEnvironments.companyId,
      cpuCount: agentEnvironments.cpuCount,
      createdAt: agentEnvironments.createdAt,
      diskSpaceGb: agentEnvironments.diskSpaceGb,
      displayName: agentEnvironments.displayName,
      id: agentEnvironments.id,
      lastSeenAt: agentEnvironments.lastSeenAt,
      memoryGb: agentEnvironments.memoryGb,
      metadata: agentEnvironments.metadata,
      platform: agentEnvironments.platform,
      provider: agentEnvironments.provider,
      providerEnvironmentId: agentEnvironments.providerEnvironmentId,
      updatedAt: agentEnvironments.updatedAt,
    };
  }
}
