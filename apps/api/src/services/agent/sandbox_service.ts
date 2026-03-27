import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { agentSandboxes, agentSessions } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

type SessionRow = {
  agentId: string;
  companyId: string;
  id: string;
};

type AgentSandboxRow = {
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
  providerSandboxId: string;
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

export type AgentSandboxRecord = {
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
  providerSandboxId: string;
  status: string;
  updatedAt: Date;
};

type AgentSandboxProvisionContext = {
  agentId: string;
  companyId: string;
  sessionId: string;
};

type AgentSandboxProvisionResult = {
  cleanup?: () => Promise<void>;
  cpuCount: number;
  diskSpaceGb: number;
  memoryGb: number;
  providerSandboxId: string;
  status: string;
};

type AgentSandboxRuntimeUpdate = {
  cpuCount: number;
  diskSpaceGb: number;
  memoryGb: number;
  status: string;
};

/**
 * Owns the provider-agnostic sandbox lease lifecycle for one agent session. Its scope is claiming
 * and reusing persisted sandbox rows, while delegating provider-specific provisioning details to
 * the caller through a narrow callback that returns generic runtime metadata.
 */
@injectable()
export class AgentSandboxService {
  static readonly LEASE_TTL_MILLISECONDS = 15 * 60 * 1000;

  async materializeSandboxForSession(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    agentId: string,
    provider: string,
    provisionSandbox: (context: AgentSandboxProvisionContext) => Promise<AgentSandboxProvisionResult>,
  ): Promise<AgentSandboxRecord> {
    const now = new Date();
    const session = await this.loadSession(transactionProvider, sessionId);
    if (session.agentId !== agentId) {
      throw new Error("Session does not belong to the agent.");
    }

    const existingSessionSandbox = await this.findActiveSessionSandbox(transactionProvider, sessionId, provider, now);
    if (existingSessionSandbox) {
      const refreshedSessionSandbox = await this.refreshLease(
        transactionProvider,
        existingSessionSandbox.id,
        sessionId,
        now,
      );
      if (refreshedSessionSandbox) {
        return refreshedSessionSandbox;
      }
    }

    const reusableSandboxes = await this.listReusableAgentSandboxes(transactionProvider, agentId, provider, now);
    for (const sandbox of reusableSandboxes) {
      const claimedSandbox = await this.claimSandbox(transactionProvider, sandbox.id, sessionId, now);
      if (claimedSandbox) {
        return claimedSandbox;
      }
    }

    return this.createSandbox(
      transactionProvider,
      {
        agentId,
        companyId: session.companyId,
        sessionId,
      },
      now,
      provider,
      provisionSandbox,
    );
  }

  async updateSandboxRuntimeState(
    transactionProvider: TransactionProviderInterface,
    sandboxId: string,
    runtimeUpdate: AgentSandboxRuntimeUpdate,
  ): Promise<AgentSandboxRecord> {
    return transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const [updatedSandbox] = await updatableDatabase
        .update(agentSandboxes)
        .set({
          cpuCount: runtimeUpdate.cpuCount,
          diskSpaceGb: runtimeUpdate.diskSpaceGb,
          memoryGb: runtimeUpdate.memoryGb,
          status: runtimeUpdate.status,
          updatedAt: new Date(),
        })
        .where(eq(agentSandboxes.id, sandboxId))
        .returning?.(this.sandboxSelection()) as AgentSandboxRecord[];
      if (!updatedSandbox) {
        throw new Error("Failed to update the sandbox runtime state.");
      }

      return updatedSandbox;
    });
  }

  private async createSandbox(
    transactionProvider: TransactionProviderInterface,
    context: AgentSandboxProvisionContext,
    now: Date,
    provider: string,
    provisionSandbox: (context: AgentSandboxProvisionContext) => Promise<AgentSandboxProvisionResult>,
  ): Promise<AgentSandboxRecord> {
    const provisionedSandbox = await provisionSandbox(context);

    try {
      return await transactionProvider.transaction(async (tx) => {
        const insertableDatabase = tx as InsertableDatabase;
        const [insertedSandbox] = await insertableDatabase
          .insert(agentSandboxes)
          .values({
            agentId: context.agentId,
            companyId: context.companyId,
            cpuCount: provisionedSandbox.cpuCount,
            createdAt: now,
            currentSessionId: context.sessionId,
            diskSpaceGb: provisionedSandbox.diskSpaceGb,
            lastUsedAt: now,
            leaseExpiresAt: this.resolveLeaseExpiration(now),
            memoryGb: provisionedSandbox.memoryGb,
            provider,
            providerSandboxId: provisionedSandbox.providerSandboxId,
            status: provisionedSandbox.status,
            updatedAt: now,
          })
          .returning?.(this.sandboxSelection()) as AgentSandboxRecord[];
        if (!insertedSandbox) {
          throw new Error("Failed to persist the created sandbox.");
        }

        return insertedSandbox;
      });
    } catch (error) {
      await provisionedSandbox.cleanup?.().catch(() => undefined);
      throw error;
    }
  }

  private async claimSandbox(
    transactionProvider: TransactionProviderInterface,
    sandboxId: string,
    sessionId: string,
    now: Date,
  ): Promise<AgentSandboxRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const [claimedSandbox] = await updatableDatabase
        .update(agentSandboxes)
        .set({
          currentSessionId: sessionId,
          lastUsedAt: now,
          leaseExpiresAt: this.resolveLeaseExpiration(now),
          updatedAt: now,
        })
        .where(eq(agentSandboxes.id, sandboxId))
        .returning?.(this.sandboxSelection()) as AgentSandboxRecord[];

      return claimedSandbox ?? null;
    });
  }

  private async findActiveSessionSandbox(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    provider: string,
    now: Date,
  ): Promise<AgentSandboxRecord | null> {
    const sandboxes = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return await selectableDatabase
        .select(this.sandboxSelection())
        .from(agentSandboxes)
        .where(and(
          eq(agentSandboxes.currentSessionId, sessionId),
          eq(agentSandboxes.provider, provider),
        )) as AgentSandboxRow[];
    });

    for (const sandbox of sandboxes) {
      if (!sandbox.leaseExpiresAt || sandbox.leaseExpiresAt.getTime() <= now.getTime()) {
        continue;
      }

      return sandbox;
    }

    return null;
  }

  private async listReusableAgentSandboxes(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    provider: string,
    now: Date,
  ): Promise<AgentSandboxRecord[]> {
    const sandboxes = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return await selectableDatabase
        .select(this.sandboxSelection())
        .from(agentSandboxes)
        .where(and(
          eq(agentSandboxes.agentId, agentId),
          eq(agentSandboxes.provider, provider),
        )) as AgentSandboxRow[];
    });

    return [...sandboxes]
      .filter((sandbox) => !sandbox.leaseExpiresAt || sandbox.leaseExpiresAt.getTime() <= now.getTime())
      .sort((leftSandbox, rightSandbox) => {
        const leftTimestamp = leftSandbox.lastUsedAt?.getTime() ?? leftSandbox.createdAt.getTime();
        const rightTimestamp = rightSandbox.lastUsedAt?.getTime() ?? rightSandbox.createdAt.getTime();
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
    sandboxId: string,
    sessionId: string,
    now: Date,
  ): Promise<AgentSandboxRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const [refreshedSandbox] = await updatableDatabase
        .update(agentSandboxes)
        .set({
          currentSessionId: sessionId,
          lastUsedAt: now,
          leaseExpiresAt: this.resolveLeaseExpiration(now),
          updatedAt: now,
        })
        .where(eq(agentSandboxes.id, sandboxId))
        .returning?.(this.sandboxSelection()) as AgentSandboxRecord[];

      return refreshedSandbox ?? null;
    });
  }

  private resolveLeaseExpiration(now: Date): Date {
    return new Date(now.getTime() + AgentSandboxService.LEASE_TTL_MILLISECONDS);
  }

  private sandboxSelection() {
    return {
      agentId: agentSandboxes.agentId,
      companyId: agentSandboxes.companyId,
      cpuCount: agentSandboxes.cpuCount,
      createdAt: agentSandboxes.createdAt,
      currentSessionId: agentSandboxes.currentSessionId,
      diskSpaceGb: agentSandboxes.diskSpaceGb,
      id: agentSandboxes.id,
      lastUsedAt: agentSandboxes.lastUsedAt,
      leaseExpiresAt: agentSandboxes.leaseExpiresAt,
      memoryGb: agentSandboxes.memoryGb,
      provider: agentSandboxes.provider,
      providerSandboxId: agentSandboxes.providerSandboxId,
      status: agentSandboxes.status,
      updatedAt: agentSandboxes.updatedAt,
    };
  }
}
