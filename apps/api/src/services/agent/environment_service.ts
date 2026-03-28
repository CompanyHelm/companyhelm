import { and, eq, isNull, lte, or } from "drizzle-orm";
import { injectable } from "inversify";
import { agentEnvironments, agentSessions } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

type SessionRow = {
  agentId: string;
  companyId: string;
  id: string;
};

type AgentEnvironmentRow = {
  agentId: string;
  companyId: string;
  cpuCount: number;
  createdAt: Date;
  currentSessionId: string | null;
  diskSpaceGb: number;
  id: string;
  lastUsedAt: Date | null;
  leaseExpiresAt: Date | null;
  memoryGb: number;
  provider: string;
  providerEnvironmentId: string;
  status: string;
  updatedAt: Date;
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

export type AgentEnvironmentRecord = {
  agentId: string;
  companyId: string;
  cpuCount: number;
  createdAt: Date;
  currentSessionId: string | null;
  diskSpaceGb: number;
  id: string;
  lastUsedAt: Date | null;
  leaseExpiresAt: Date | null;
  memoryGb: number;
  provider: string;
  providerEnvironmentId: string;
  status: string;
  updatedAt: Date;
};

type AgentEnvironmentProvisionContext = {
  agentId: string;
  companyId: string;
  sessionId: string;
};

type AgentEnvironmentProvisionResult = {
  cleanup?: () => Promise<void>;
  cpuCount: number;
  diskSpaceGb: number;
  memoryGb: number;
  providerEnvironmentId: string;
  status: string;
};

type AgentEnvironmentRuntimeUpdate = {
  cpuCount: number;
  diskSpaceGb: number;
  memoryGb: number;
  status: string;
};

/**
 * Owns the provider-agnostic environment lease lifecycle for one agent session. Its scope is
 * claiming and reusing persisted environment rows, while delegating provider-specific provisioning details to
 * the caller through a narrow callback that returns generic runtime metadata.
 */
@injectable()
export class AgentEnvironmentService {
  static readonly LEASE_TTL_MILLISECONDS = 15 * 60 * 1000;

  async materializeEnvironmentForSession(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    agentId: string,
    provider: string,
    provisionEnvironment: (context: AgentEnvironmentProvisionContext) => Promise<AgentEnvironmentProvisionResult>,
  ): Promise<AgentEnvironmentRecord> {
    const now = new Date();
    const session = await this.loadSession(transactionProvider, sessionId);
    if (session.agentId !== agentId) {
      throw new Error("Session does not belong to the agent.");
    }

    const existingSessionEnvironment = await this.findActiveSessionEnvironment(transactionProvider, sessionId, provider, now);
    if (existingSessionEnvironment) {
      const refreshedSessionEnvironment = await this.refreshLease(
        transactionProvider,
        existingSessionEnvironment.id,
        sessionId,
        now,
      );
      if (refreshedSessionEnvironment) {
        return refreshedSessionEnvironment;
      }
    }

    const reusableEnvironments = await this.listReusableAgentEnvironments(transactionProvider, agentId, provider, now);
    for (const environment of reusableEnvironments) {
      const claimedEnvironment = await this.claimEnvironment(transactionProvider, environment.id, sessionId, now);
      if (claimedEnvironment) {
        return claimedEnvironment;
      }
    }

    return this.createEnvironment(
      transactionProvider,
      {
        agentId,
        companyId: session.companyId,
        sessionId,
      },
      now,
      provider,
      provisionEnvironment,
    );
  }

  async updateEnvironmentRuntimeState(
    transactionProvider: TransactionProviderInterface,
    environmentId: string,
    runtimeUpdate: AgentEnvironmentRuntimeUpdate,
  ): Promise<AgentEnvironmentRecord> {
    return transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const [updatedEnvironment] = await updatableDatabase
        .update(agentEnvironments)
        .set({
          cpuCount: runtimeUpdate.cpuCount,
          diskSpaceGb: runtimeUpdate.diskSpaceGb,
          memoryGb: runtimeUpdate.memoryGb,
          status: runtimeUpdate.status,
          updatedAt: new Date(),
        })
        .where(eq(agentEnvironments.id, environmentId))
        .returning?.(this.environmentSelection()) as AgentEnvironmentRecord[];
      if (!updatedEnvironment) {
        throw new Error("Failed to update the environment runtime state.");
      }

      return updatedEnvironment;
    });
  }

  async releaseEnvironmentForSession(
    transactionProvider: TransactionProviderInterface,
    environmentId: string,
    sessionId: string,
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(agentEnvironments)
        .set({
          currentSessionId: null,
          leaseExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(agentEnvironments.id, environmentId),
          eq(agentEnvironments.currentSessionId, sessionId),
        ))
        .returning?.(this.environmentSelection());
    });
  }

  private async createEnvironment(
    transactionProvider: TransactionProviderInterface,
    context: AgentEnvironmentProvisionContext,
    now: Date,
    provider: string,
    provisionEnvironment: (context: AgentEnvironmentProvisionContext) => Promise<AgentEnvironmentProvisionResult>,
  ): Promise<AgentEnvironmentRecord> {
    const provisionedEnvironment = await provisionEnvironment(context);

    try {
      return await transactionProvider.transaction(async (tx) => {
        const insertableDatabase = tx as InsertableDatabase;
        const [insertedEnvironment] = await insertableDatabase
          .insert(agentEnvironments)
          .values({
            agentId: context.agentId,
            companyId: context.companyId,
            cpuCount: provisionedEnvironment.cpuCount,
            createdAt: now,
            currentSessionId: context.sessionId,
            diskSpaceGb: provisionedEnvironment.diskSpaceGb,
            lastUsedAt: now,
            leaseExpiresAt: this.resolveLeaseExpiration(now),
            memoryGb: provisionedEnvironment.memoryGb,
            provider,
            providerEnvironmentId: provisionedEnvironment.providerEnvironmentId,
            status: provisionedEnvironment.status,
            updatedAt: now,
          })
          .returning?.(this.environmentSelection()) as AgentEnvironmentRecord[];
        if (!insertedEnvironment) {
          throw new Error("Failed to persist the created environment.");
        }

        return insertedEnvironment;
      });
    } catch (error) {
      await provisionedEnvironment.cleanup?.().catch(() => undefined);
      throw error;
    }
  }

  private async claimEnvironment(
    transactionProvider: TransactionProviderInterface,
    environmentId: string,
    sessionId: string,
    now: Date,
  ): Promise<AgentEnvironmentRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const [claimedEnvironment] = await updatableDatabase
        .update(agentEnvironments)
        .set({
          currentSessionId: sessionId,
          lastUsedAt: now,
          leaseExpiresAt: this.resolveLeaseExpiration(now),
          updatedAt: now,
        })
        .where(and(
          eq(agentEnvironments.id, environmentId),
          or(
            isNull(agentEnvironments.leaseExpiresAt),
            lte(agentEnvironments.leaseExpiresAt, now),
          ),
        ))
        .returning?.(this.environmentSelection()) as AgentEnvironmentRecord[];

      return claimedEnvironment ?? null;
    });
  }

  private async findActiveSessionEnvironment(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    provider: string,
    now: Date,
  ): Promise<AgentEnvironmentRecord | null> {
    const environments = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return await selectableDatabase
        .select(this.environmentSelection())
        .from(agentEnvironments)
        .where(and(
          eq(agentEnvironments.currentSessionId, sessionId),
          eq(agentEnvironments.provider, provider),
        )) as AgentEnvironmentRow[];
    });

    for (const environment of environments) {
      if (!environment.leaseExpiresAt || environment.leaseExpiresAt.getTime() <= now.getTime()) {
        continue;
      }

      return environment;
    }

    return null;
  }

  private async listReusableAgentEnvironments(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    provider: string,
    now: Date,
  ): Promise<AgentEnvironmentRecord[]> {
    const environments = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return await selectableDatabase
        .select(this.environmentSelection())
        .from(agentEnvironments)
        .where(and(
          eq(agentEnvironments.agentId, agentId),
          eq(agentEnvironments.provider, provider),
        )) as AgentEnvironmentRow[];
    });

    return [...environments]
      .filter((environment) => !environment.leaseExpiresAt || environment.leaseExpiresAt.getTime() <= now.getTime())
      .sort((leftEnvironment, rightEnvironment) => {
        const leftTimestamp = leftEnvironment.lastUsedAt?.getTime() ?? leftEnvironment.createdAt.getTime();
        const rightTimestamp = rightEnvironment.lastUsedAt?.getTime() ?? rightEnvironment.createdAt.getTime();
        return rightTimestamp - leftTimestamp;
      });
  }

  private async loadSession(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
  ): Promise<SessionRow> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [session] = await selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          companyId: agentSessions.companyId,
          id: agentSessions.id,
        })
        .from(agentSessions)
        .where(eq(agentSessions.id, sessionId)) as SessionRow[];
      if (!session) {
        throw new Error("Session not found.");
      }

      return session;
    });
  }

  private async refreshLease(
    transactionProvider: TransactionProviderInterface,
    environmentId: string,
    sessionId: string,
    now: Date,
  ): Promise<AgentEnvironmentRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const [refreshedEnvironment] = await updatableDatabase
        .update(agentEnvironments)
        .set({
          currentSessionId: sessionId,
          lastUsedAt: now,
          leaseExpiresAt: this.resolveLeaseExpiration(now),
          updatedAt: now,
        })
        .where(and(
          eq(agentEnvironments.id, environmentId),
          eq(agentEnvironments.currentSessionId, sessionId),
        ))
        .returning?.(this.environmentSelection()) as AgentEnvironmentRecord[];

      return refreshedEnvironment ?? null;
    });
  }

  private resolveLeaseExpiration(now: Date): Date {
    return new Date(now.getTime() + AgentEnvironmentService.LEASE_TTL_MILLISECONDS);
  }

  private environmentSelection() {
    return {
      agentId: agentEnvironments.agentId,
      companyId: agentEnvironments.companyId,
      cpuCount: agentEnvironments.cpuCount,
      createdAt: agentEnvironments.createdAt,
      currentSessionId: agentEnvironments.currentSessionId,
      diskSpaceGb: agentEnvironments.diskSpaceGb,
      id: agentEnvironments.id,
      lastUsedAt: agentEnvironments.lastUsedAt,
      leaseExpiresAt: agentEnvironments.leaseExpiresAt,
      memoryGb: agentEnvironments.memoryGb,
      provider: agentEnvironments.provider,
      providerEnvironmentId: agentEnvironments.providerEnvironmentId,
      status: agentEnvironments.status,
      updatedAt: agentEnvironments.updatedAt,
    };
  }
}
