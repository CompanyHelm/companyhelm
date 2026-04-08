import { and, eq, inArray, lte, or } from "drizzle-orm";
import { injectable } from "inversify";
import { agentEnvironmentLeases } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type AgentEnvironmentLeaseRecord = {
  acquiredAt: Date;
  agentId: string;
  companyId: string;
  createdAt: Date;
  environmentId: string;
  expiresAt: Date;
  id: string;
  lastHeartbeatAt: Date | null;
  ownerToken: string | null;
  releaseReason: string | null;
  releasedAt: Date | null;
  sessionId: string;
  state: "active" | "expired" | "idle" | "released";
  updatedAt: Date;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
      orderBy?(...clauses: unknown[]): Promise<Array<Record<string, unknown>>>;
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
 * Owns durable lease history for environments. The lease table is the single source of truth for
 * which session currently owns an environment and for which environments a session or agent should
 * prefer to reuse later.
 */
@injectable()
export class AgentEnvironmentLeaseService {
  static readonly ACTIVE_LEASE_TTL_MILLISECONDS = 10 * 60 * 1000;
  static readonly IDLE_LEASE_TTL_MILLISECONDS = 10 * 60 * 1000;

  async acquireLease(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      environmentId: string;
      ownerToken: string;
      sessionId: string;
    },
  ): Promise<AgentEnvironmentLeaseRecord> {
    const now = new Date();
    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const [lease] = await insertableDatabase
        .insert(agentEnvironmentLeases)
        .values({
          acquiredAt: now,
          agentId: input.agentId,
          companyId: input.companyId,
          createdAt: now,
          environmentId: input.environmentId,
          expiresAt: this.resolveActiveExpiration(now),
          lastHeartbeatAt: now,
          ownerToken: input.ownerToken,
          sessionId: input.sessionId,
          state: "active",
          updatedAt: now,
        })
        .returning?.(this.leaseSelection()) as AgentEnvironmentLeaseRecord[];
      if (!lease) {
        throw new Error("Failed to acquire the environment lease.");
      }

      return lease;
    });
  }

  async activateLease(
    transactionProvider: TransactionProviderInterface,
    leaseId: string,
    ownerToken: string,
  ): Promise<AgentEnvironmentLeaseRecord> {
    const now = new Date();
    return transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const [lease] = await updatableDatabase
        .update(agentEnvironmentLeases)
        .set({
          expiresAt: this.resolveActiveExpiration(now),
          lastHeartbeatAt: now,
          ownerToken,
          state: "active",
          updatedAt: now,
        })
        .where(eq(agentEnvironmentLeases.id, leaseId))
        .returning?.(this.leaseSelection()) as AgentEnvironmentLeaseRecord[];
      if (!lease) {
        throw new Error("Failed to activate the environment lease.");
      }

      return lease;
    });
  }

  async expireElapsedLeases(transactionProvider: TransactionProviderInterface): Promise<void> {
    const now = new Date();
    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(agentEnvironmentLeases)
        .set({
          releaseReason: "expired",
          releasedAt: now,
          state: "expired",
          updatedAt: now,
        })
        .where(and(
          or(
            eq(agentEnvironmentLeases.state, "active"),
            eq(agentEnvironmentLeases.state, "idle"),
          ),
          lte(agentEnvironmentLeases.expiresAt, now),
        ))
        .returning?.(this.leaseSelection());
    });
  }

  async findOpenLeaseForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    providerSessionId: string,
  ): Promise<AgentEnvironmentLeaseRecord | null> {
    const leases = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select(this.leaseSelection())
        .from(agentEnvironmentLeases)
        .where(and(
          eq(agentEnvironmentLeases.agentId, agentId),
          eq(agentEnvironmentLeases.sessionId, providerSessionId),
          or(
            eq(agentEnvironmentLeases.state, "active"),
            eq(agentEnvironmentLeases.state, "idle"),
          ),
        )) as Promise<AgentEnvironmentLeaseRecord[]>;
    });

    return [...leases].sort((leftLease, rightLease) => rightLease.updatedAt.getTime() - leftLease.updatedAt.getTime())[0] ?? null;
  }

  async heartbeatLease(
    transactionProvider: TransactionProviderInterface,
    leaseId: string,
    ownerToken: string,
  ): Promise<void> {
    const now = new Date();
    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(agentEnvironmentLeases)
        .set({
          expiresAt: this.resolveActiveExpiration(now),
          lastHeartbeatAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(agentEnvironmentLeases.id, leaseId),
          eq(agentEnvironmentLeases.ownerToken, ownerToken),
          eq(agentEnvironmentLeases.state, "active"),
        ))
        .returning?.(this.leaseSelection());
    });
  }

  async listOpenLeasesForEnvironments(
    transactionProvider: TransactionProviderInterface,
    environmentIds: string[],
  ): Promise<AgentEnvironmentLeaseRecord[]> {
    if (environmentIds.length === 0) {
      return [];
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select(this.leaseSelection())
        .from(agentEnvironmentLeases)
        .where(and(
          inArray(agentEnvironmentLeases.environmentId, environmentIds),
          or(
            eq(agentEnvironmentLeases.state, "active"),
            eq(agentEnvironmentLeases.state, "idle"),
          ),
        )) as Promise<AgentEnvironmentLeaseRecord[]>;
    });
  }

  async listSessionLeaseHistory(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ): Promise<AgentEnvironmentLeaseRecord[]> {
    const leases = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const fromClause = selectableDatabase
        .select(this.leaseSelection())
        .from(agentEnvironmentLeases);
      if (!fromClause.orderBy) {
        return fromClause.where(and(
          eq(agentEnvironmentLeases.agentId, agentId),
          eq(agentEnvironmentLeases.sessionId, sessionId),
        )) as Promise<AgentEnvironmentLeaseRecord[]>;
      }

      return fromClause
        .where(and(
          eq(agentEnvironmentLeases.agentId, agentId),
          eq(agentEnvironmentLeases.sessionId, sessionId),
        ))
        .then((rows) => rows as AgentEnvironmentLeaseRecord[]);
    });

    return [...leases].sort((leftLease, rightLease) => rightLease.updatedAt.getTime() - leftLease.updatedAt.getTime());
  }

  async listAgentLeaseHistory(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
  ): Promise<AgentEnvironmentLeaseRecord[]> {
    const leases = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select(this.leaseSelection())
        .from(agentEnvironmentLeases)
        .where(eq(agentEnvironmentLeases.agentId, agentId)) as Promise<AgentEnvironmentLeaseRecord[]>;
    });

    return [...leases].sort((leftLease, rightLease) => rightLease.updatedAt.getTime() - leftLease.updatedAt.getTime());
  }

  async markLeaseIdle(
    transactionProvider: TransactionProviderInterface,
    leaseId: string,
    ownerToken: string,
  ): Promise<void> {
    const now = new Date();
    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(agentEnvironmentLeases)
        .set({
          expiresAt: this.resolveIdleExpiration(now),
          ownerToken: null,
          state: "idle",
          updatedAt: now,
        })
        .where(and(
          eq(agentEnvironmentLeases.id, leaseId),
          eq(agentEnvironmentLeases.ownerToken, ownerToken),
        ))
        .returning?.(this.leaseSelection());
    });
  }

  async releaseLease(
    transactionProvider: TransactionProviderInterface,
    leaseId: string,
    reason: string,
  ): Promise<void> {
    const now = new Date();
    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(agentEnvironmentLeases)
        .set({
          ownerToken: null,
          releaseReason: reason,
          releasedAt: now,
          state: "released",
          updatedAt: now,
        })
        .where(eq(agentEnvironmentLeases.id, leaseId))
        .returning?.(this.leaseSelection());
    });
  }

  private leaseSelection() {
    return {
      acquiredAt: agentEnvironmentLeases.acquiredAt,
      agentId: agentEnvironmentLeases.agentId,
      companyId: agentEnvironmentLeases.companyId,
      createdAt: agentEnvironmentLeases.createdAt,
      environmentId: agentEnvironmentLeases.environmentId,
      expiresAt: agentEnvironmentLeases.expiresAt,
      id: agentEnvironmentLeases.id,
      lastHeartbeatAt: agentEnvironmentLeases.lastHeartbeatAt,
      ownerToken: agentEnvironmentLeases.ownerToken,
      releaseReason: agentEnvironmentLeases.releaseReason,
      releasedAt: agentEnvironmentLeases.releasedAt,
      sessionId: agentEnvironmentLeases.sessionId,
      state: agentEnvironmentLeases.state,
      updatedAt: agentEnvironmentLeases.updatedAt,
    };
  }

  private resolveActiveExpiration(now: Date): Date {
    return new Date(now.getTime() + AgentEnvironmentLeaseService.ACTIVE_LEASE_TTL_MILLISECONDS);
  }

  private resolveIdleExpiration(now: Date): Date {
    return new Date(now.getTime() + AgentEnvironmentLeaseService.IDLE_LEASE_TTL_MILLISECONDS);
  }
}
