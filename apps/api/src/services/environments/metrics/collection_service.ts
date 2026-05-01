import { and, eq, lt } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { AdminDatabase } from "../../../db/admin_database.ts";
import { AppRuntimeDatabase } from "../../../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../../../db/app_runtime_transaction_provider.ts";
import {
  agentEnvironmentMetricSamples,
  agentEnvironments,
} from "../../../db/schema.ts";
import type { AgentEnvironmentRecord } from "../providers/provider_interface.ts";
import { EnvironmentMetricsAdapterRegistry } from "./registry.ts";

type AdminSelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): Promise<Array<Record<string, unknown>>>;
  };
};

type RuntimeWritableTransaction = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      onConflictDoUpdate(input: {
        set: Record<string, unknown>;
        target: unknown;
      }): Promise<unknown>;
    };
  };
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

export type EnvironmentMetricsCollectionResult = {
  checkedEnvironments: number;
  failedEnvironments: number;
  skippedEnvironments: number;
  updatedEnvironments: number;
};

/**
 * Coordinates one full environment metrics sweep. The service reads the global environment catalog
 * with the admin role, fetches provider telemetry through the adapter registry, stores minute
 * trend samples inside the company runtime context, and prunes anything older than one hour.
 */
@injectable()
export class EnvironmentMetricsCollectionService {
  private static readonly HISTORY_RETENTION_MINUTES = 60;

  private readonly adminDatabase: AdminDatabase;
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly registry: EnvironmentMetricsAdapterRegistry;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(EnvironmentMetricsAdapterRegistry)
    registry: EnvironmentMetricsAdapterRegistry,
  ) {
    this.adminDatabase = adminDatabase;
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.registry = registry;
  }

  async collectAllEnvironments(): Promise<EnvironmentMetricsCollectionResult> {
    const environments = await this.listAllEnvironments();
    const companiesToPrune = new Set<string>();
    let failedEnvironments = 0;
    let skippedEnvironments = 0;
    let updatedEnvironments = 0;

    for (const environment of environments) {
      companiesToPrune.add(environment.companyId);
      const transactionProvider = new AppRuntimeTransactionProvider(
        this.appRuntimeDatabase,
        environment.companyId,
      );

      try {
        const sample = await this.registry
          .get(environment.provider)
          .getLatestMetrics(transactionProvider, environment);
        if (!sample) {
          skippedEnvironments += 1;
          continue;
        }

        const minuteBucketTimestamp = EnvironmentMetricsCollectionService.truncateToMinute(sample.sampledAt);
        await transactionProvider.transaction(async (tx) => {
          const runtimeTransaction = tx as unknown as RuntimeWritableTransaction;
          await runtimeTransaction
            .insert(agentEnvironmentMetricSamples)
            .values({
              companyId: environment.companyId,
              cpuUsedPct: sample.cpuUsedPct,
              createdAt: new Date(),
              diskUsedBytes: sample.diskUsedBytes,
              environmentId: environment.id,
              memUsedBytes: sample.memUsedBytes,
              sampledAt: minuteBucketTimestamp,
            })
            .onConflictDoUpdate({
              set: {
                cpuUsedPct: sample.cpuUsedPct,
                diskUsedBytes: sample.diskUsedBytes,
                memUsedBytes: sample.memUsedBytes,
              },
              target: [agentEnvironmentMetricSamples.environmentId, agentEnvironmentMetricSamples.sampledAt],
            });

          await runtimeTransaction
            .update(agentEnvironments)
            .set({
              cpuUsedPct: sample.cpuUsedPct,
              diskUsedBytes: sample.diskUsedBytes,
              memUsedBytes: sample.memUsedBytes,
              metricsSampledAt: sample.sampledAt,
            })
            .where(and(
              eq(agentEnvironments.companyId, environment.companyId),
              eq(agentEnvironments.id, environment.id),
            ));
        });

        updatedEnvironments += 1;
      } catch {
        failedEnvironments += 1;
      }
    }

    for (const companyId of companiesToPrune) {
      await this.pruneCompanyHistory(companyId);
    }

    return {
      checkedEnvironments: environments.length,
      failedEnvironments,
      skippedEnvironments,
      updatedEnvironments,
    };
  }

  private async listAllEnvironments(): Promise<AgentEnvironmentRecord[]> {
    const database = this.adminDatabase.getDatabase() as unknown as AdminSelectableDatabase;
    return database
      .select({
        agentId: agentEnvironments.agentId,
        companyId: agentEnvironments.companyId,
        cpuCount: agentEnvironments.cpuCount,
        cpuUsedPct: agentEnvironments.cpuUsedPct,
        createdAt: agentEnvironments.createdAt,
        diskSpaceGb: agentEnvironments.diskSpaceGb,
        diskUsedBytes: agentEnvironments.diskUsedBytes,
        displayName: agentEnvironments.displayName,
        id: agentEnvironments.id,
        lastSeenAt: agentEnvironments.lastSeenAt,
        memoryGb: agentEnvironments.memoryGb,
        memUsedBytes: agentEnvironments.memUsedBytes,
        metadata: agentEnvironments.metadata,
        metricsSampledAt: agentEnvironments.metricsSampledAt,
        platform: agentEnvironments.platform,
        provider: agentEnvironments.provider,
        providerDefinitionId: agentEnvironments.providerDefinitionId,
        providerEnvironmentId: agentEnvironments.providerEnvironmentId,
        templateId: agentEnvironments.templateId,
        updatedAt: agentEnvironments.updatedAt,
      })
      .from(agentEnvironments) as Promise<AgentEnvironmentRecord[]>;
  }

  private async pruneCompanyHistory(companyId: string): Promise<void> {
    const cutoffTimestamp = new Date(
      Date.now() - EnvironmentMetricsCollectionService.HISTORY_RETENTION_MINUTES * 60 * 1000,
    );
    const transactionProvider = new AppRuntimeTransactionProvider(this.appRuntimeDatabase, companyId);
    await transactionProvider.transaction(async (tx) => {
      const runtimeTransaction = tx as unknown as RuntimeWritableTransaction;
      await runtimeTransaction
        .delete(agentEnvironmentMetricSamples)
        .where(and(
          eq(agentEnvironmentMetricSamples.companyId, companyId),
          lt(agentEnvironmentMetricSamples.sampledAt, cutoffTimestamp),
        ));
    });
  }

  private static truncateToMinute(timestamp: Date): Date {
    const minuteTimestamp = new Date(timestamp);
    minuteTimestamp.setUTCSeconds(0, 0);
    return minuteTimestamp;
  }
}
