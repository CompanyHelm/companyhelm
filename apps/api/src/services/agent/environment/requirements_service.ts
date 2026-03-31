import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../../config/schema.ts";
import { agentEnvironmentRequirements, agents } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import type { AgentEnvironmentRequirements } from "../compute/provider_interface.ts";

type AgentRecord = {
  id: string;
};

type AgentEnvironmentRequirementsRecord = AgentEnvironmentRequirements & {
  agentId: string;
  companyId: string;
  createdAt: Date;
  id: string;
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

/**
 * Resolves the desired minimum compute shape for an agent. It keeps persisted overrides separate
 * from the actual provisioned environments and falls back to configuration defaults when an agent
 * has never customized its environment requirements.
 */
@injectable()
export class AgentEnvironmentRequirementsService {
  private readonly config: Config;

  constructor(@inject(Config) config: Config) {
    this.config = config;
  }

  async getRequirements(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<AgentEnvironmentRequirements> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);

      const [persistedRequirements] = await selectableDatabase
        .select(this.requirementsSelection())
        .from(agentEnvironmentRequirements)
        .where(and(
          eq(agentEnvironmentRequirements.companyId, companyId),
          eq(agentEnvironmentRequirements.agentId, agentId),
        )) as AgentEnvironmentRequirementsRecord[];

      if (persistedRequirements) {
        return {
          minCpuCount: persistedRequirements.minCpuCount,
          minDiskSpaceGb: persistedRequirements.minDiskSpaceGb,
          minMemoryGb: persistedRequirements.minMemoryGb,
        };
      }

      return {
        minCpuCount: this.config.daytona.cpu_count,
        minDiskSpaceGb: this.config.daytona.disk_gb,
        minMemoryGb: this.config.daytona.memory_gb,
      };
    });
  }

  async updateRequirements(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      minCpuCount: number;
      minDiskSpaceGb: number;
      minMemoryGb: number;
    },
  ): Promise<AgentEnvironmentRequirements> {
    this.validateRequirements(input);

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      await this.requireAgent(selectableDatabase, input.companyId, input.agentId);

      const [existingRequirements] = await selectableDatabase
        .select({
          id: agentEnvironmentRequirements.id,
        })
        .from(agentEnvironmentRequirements)
        .where(and(
          eq(agentEnvironmentRequirements.companyId, input.companyId),
          eq(agentEnvironmentRequirements.agentId, input.agentId),
        )) as Array<{ id: string }>;

      const now = new Date();
      const nextValues = {
        minCpuCount: input.minCpuCount,
        minDiskSpaceGb: input.minDiskSpaceGb,
        minMemoryGb: input.minMemoryGb,
      };

      if (!existingRequirements) {
        const [createdRequirements] = await insertableDatabase
          .insert(agentEnvironmentRequirements)
          .values({
            agentId: input.agentId,
            companyId: input.companyId,
            createdAt: now,
            minCpuCount: input.minCpuCount,
            minDiskSpaceGb: input.minDiskSpaceGb,
            minMemoryGb: input.minMemoryGb,
            updatedAt: now,
          })
          .returning?.(this.requirementsSelection()) as AgentEnvironmentRequirementsRecord[];

        if (!createdRequirements) {
          throw new Error("Failed to create agent environment requirements.");
        }

        return nextValues;
      }

      const [updatedRequirements] = await updatableDatabase
        .update(agentEnvironmentRequirements)
        .set({
          minCpuCount: input.minCpuCount,
          minDiskSpaceGb: input.minDiskSpaceGb,
          minMemoryGb: input.minMemoryGb,
          updatedAt: now,
        })
        .where(and(
          eq(agentEnvironmentRequirements.companyId, input.companyId),
          eq(agentEnvironmentRequirements.agentId, input.agentId),
        ))
        .returning?.(this.requirementsSelection()) as AgentEnvironmentRequirementsRecord[];

      if (!updatedRequirements) {
        throw new Error("Failed to update agent environment requirements.");
      }

      return nextValues;
    });
  }

  private validateRequirements(input: {
    minCpuCount: number;
    minDiskSpaceGb: number;
    minMemoryGb: number;
  }): void {
    if (!Number.isInteger(input.minCpuCount) || input.minCpuCount <= 0) {
      throw new Error("minCpuCount must be a positive integer.");
    }
    if (!Number.isInteger(input.minMemoryGb) || input.minMemoryGb <= 0) {
      throw new Error("minMemoryGb must be a positive integer.");
    }
    if (!Number.isInteger(input.minDiskSpaceGb) || input.minDiskSpaceGb <= 0) {
      throw new Error("minDiskSpaceGb must be a positive integer.");
    }
  }

  private async requireAgent(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentId: string,
  ): Promise<AgentRecord> {
    const [agent] = await selectableDatabase
      .select({
        id: agents.id,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.id, agentId),
      )) as AgentRecord[];

    if (!agent) {
      throw new Error("Agent not found.");
    }

    return agent;
  }

  private requirementsSelection(): Record<string, unknown> {
    return {
      agentId: agentEnvironmentRequirements.agentId,
      companyId: agentEnvironmentRequirements.companyId,
      createdAt: agentEnvironmentRequirements.createdAt,
      id: agentEnvironmentRequirements.id,
      minCpuCount: agentEnvironmentRequirements.minCpuCount,
      minDiskSpaceGb: agentEnvironmentRequirements.minDiskSpaceGb,
      minMemoryGb: agentEnvironmentRequirements.minMemoryGb,
      updatedAt: agentEnvironmentRequirements.updatedAt,
    };
  }
}
