import { Daytona } from "@daytonaio/sdk";
import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
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
  daytonaSandboxId: string;
  diskSpaceGb: number;
  id: string;
  lastUsedAt: Date | null;
  leaseExpiresAt: Date | null;
  memoryGb: number;
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
  daytonaSandboxId: string;
  diskSpaceGb: number;
  id: string;
  lastUsedAt: Date | null;
  leaseExpiresAt: Date | null;
  memoryGb: number;
  status: string;
  updatedAt: Date;
};

/**
 * Owns the lease-aware sandbox lookup for one agent session. Its scope is claiming an existing
 * agent sandbox when the lease is still valid or reclaimable, and provisioning a new Daytona
 * sandbox only when there is no reusable sandbox row left for the agent.
 */
@injectable()
export class AgentSandboxService {
  static readonly DEFAULT_CPU_COUNT = 2;
  static readonly DEFAULT_DISK_SPACE_GB = 20;
  static readonly DEFAULT_MEMORY_GB = 4;
  static readonly LEASE_TTL_MILLISECONDS = 15 * 60 * 1000;

  private readonly config: Config;
  private daytona?: Daytona;

  constructor(@inject(Config) config: Config) {
    this.config = config;
  }

  async getSandboxForSession(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    agentId: string,
  ): Promise<AgentSandboxRecord> {
    const now = new Date();
    const session = await this.loadSession(transactionProvider, sessionId);
    if (session.agentId !== agentId) {
      throw new Error("Session does not belong to the agent.");
    }

    const existingSessionSandbox = await this.findActiveSessionSandbox(transactionProvider, sessionId, now);
    if (existingSessionSandbox) {
      const refreshedSessionSandbox = await this.refreshLease(
        transactionProvider,
        existingSessionSandbox.id,
        sessionId,
        now,
      );
      if (refreshedSessionSandbox) {
        return this.ensureRunningSandbox(transactionProvider, refreshedSessionSandbox);
      }
    }

    const reusableSandboxes = await this.listReusableAgentSandboxes(transactionProvider, agentId, now);
    for (const sandbox of reusableSandboxes) {
      const claimedSandbox = await this.claimSandbox(transactionProvider, sandbox.id, sessionId, now);
      if (!claimedSandbox) {
        continue;
      }

      return this.ensureRunningSandbox(transactionProvider, claimedSandbox);
    }

    return this.createSandbox(transactionProvider, session.companyId, sessionId, agentId, now);
  }

  private async createSandbox(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    agentId: string,
    now: Date,
  ): Promise<AgentSandboxRecord> {
    const remoteSandbox = await this.getDaytonaClient().create({
      image: "node:20-slim",
      resources: {
        cpu: AgentSandboxService.DEFAULT_CPU_COUNT,
        disk: AgentSandboxService.DEFAULT_DISK_SPACE_GB,
        memory: AgentSandboxService.DEFAULT_MEMORY_GB,
      },
    });

    try {
      return await transactionProvider.transaction(async (tx) => {
        const insertableDatabase = tx as InsertableDatabase;
        const [insertedSandbox] = await insertableDatabase
          .insert(agentSandboxes)
          .values({
            agentId,
            companyId,
            cpuCount: remoteSandbox.cpu || AgentSandboxService.DEFAULT_CPU_COUNT,
            createdAt: now,
            currentSessionId: sessionId,
            daytonaSandboxId: remoteSandbox.id,
            diskSpaceGb: remoteSandbox.disk || AgentSandboxService.DEFAULT_DISK_SPACE_GB,
            lastUsedAt: now,
            leaseExpiresAt: this.resolveLeaseExpiration(now),
            memoryGb: remoteSandbox.memory || AgentSandboxService.DEFAULT_MEMORY_GB,
            status: "running",
            updatedAt: now,
          })
          .returning?.(this.sandboxSelection()) as AgentSandboxRecord[];
        if (!insertedSandbox) {
          throw new Error("Failed to persist the created sandbox.");
        }

        return insertedSandbox;
      });
    } catch (error) {
      await remoteSandbox.delete().catch(() => undefined);
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

  private async ensureRunningSandbox(
    transactionProvider: TransactionProviderInterface,
    sandbox: AgentSandboxRecord,
  ): Promise<AgentSandboxRecord> {
    if (sandbox.status === "running") {
      return sandbox;
    }

    const remoteSandbox = await this.getDaytonaClient().get(sandbox.daytonaSandboxId);
    await remoteSandbox.start();
    await remoteSandbox.refreshData();

    return transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const [updatedSandbox] = await updatableDatabase
        .update(agentSandboxes)
        .set({
          cpuCount: remoteSandbox.cpu || sandbox.cpuCount,
          diskSpaceGb: remoteSandbox.disk || sandbox.diskSpaceGb,
          memoryGb: remoteSandbox.memory || sandbox.memoryGb,
          status: "running",
          updatedAt: new Date(),
        })
        .where(eq(agentSandboxes.id, sandbox.id))
        .returning?.(this.sandboxSelection()) as AgentSandboxRecord[];
      if (!updatedSandbox) {
        throw new Error("Failed to update the sandbox status.");
      }

      return updatedSandbox;
    });
  }

  private async findActiveSessionSandbox(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    now: Date,
  ): Promise<AgentSandboxRecord | null> {
    const sandboxes = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return await selectableDatabase
        .select(this.sandboxSelection())
        .from(agentSandboxes)
        .where(eq(agentSandboxes.currentSessionId, sessionId)) as AgentSandboxRow[];
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
    now: Date,
  ): Promise<AgentSandboxRecord[]> {
    const sandboxes = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return await selectableDatabase
        .select(this.sandboxSelection())
        .from(agentSandboxes)
        .where(eq(agentSandboxes.agentId, agentId)) as AgentSandboxRow[];
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

  private getDaytonaClient(): Daytona {
    if (this.daytona) {
      return this.daytona;
    }

    this.daytona = new Daytona({
      apiKey: this.config.daytona.api_key,
    });

    return this.daytona;
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
      daytonaSandboxId: agentSandboxes.daytonaSandboxId,
      diskSpaceGb: agentSandboxes.diskSpaceGb,
      id: agentSandboxes.id,
      lastUsedAt: agentSandboxes.lastUsedAt,
      leaseExpiresAt: agentSandboxes.leaseExpiresAt,
      memoryGb: agentSandboxes.memoryGb,
      status: agentSandboxes.status,
      updatedAt: agentSandboxes.updatedAt,
    };
  }
}
