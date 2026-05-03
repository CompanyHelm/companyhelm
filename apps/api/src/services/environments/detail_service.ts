import { and, asc, eq, gte, lte } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { agentEnvironmentMetricSamples, agents } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { ComputeProviderDefinitionService } from "../compute_provider_definitions/service.ts";
import { AgentEnvironmentCatalogService } from "./catalog_service.ts";
import type { AgentEnvironmentRecord } from "./providers/provider_interface.ts";
import { AgentComputeProviderRegistry } from "./providers/provider_registry.ts";

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        orderBy(order: unknown): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

export type EnvironmentDetailRecord = {
  agentId: string;
  agentName: string | null;
  companyId: string;
  cpuCount: number;
  cpuUsedPct: number | null;
  createdAt: Date;
  diskSpaceGb: number;
  diskUsedBytes: number | null;
  displayName: string | null;
  id: string;
  lastSeenAt: Date | null;
  memoryGb: number;
  memUsedBytes: number | null;
  metricsSampledAt: Date | null;
  platform: "linux" | "macos" | "windows";
  provider: "e2b";
  providerDefinitionId: string | null;
  providerDefinitionName: string | null;
  providerEnvironmentId: string;
  statusErrorMessage: string | null;
  status: string;
  templateId: string;
  updatedAt: Date;
};

export type EnvironmentMetricSampleRecord = {
  cpuUsedPct: number | null;
  diskUsedBytes: number | null;
  memUsedBytes: number | null;
  sampledAt: Date;
};

/**
 * Loads one company-scoped environment plus its recent metrics history so GraphQL detail pages can
 * show both the current environment summary and the last hour of minute-bucketed telemetry.
 */
@injectable()
export class AgentEnvironmentDetailService {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly providerRegistry: AgentComputeProviderRegistry;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
    @inject(AgentComputeProviderRegistry) providerRegistry: AgentComputeProviderRegistry,
  ) {
    this.catalogService = catalogService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.providerRegistry = providerRegistry;
  }

  async getEnvironment(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    environmentId: string,
  ): Promise<EnvironmentDetailRecord> {
    const environment = await this.catalogService.loadEnvironmentById(transactionProvider, environmentId);
    if (!environment || environment.companyId !== companyId) {
      throw new Error("Environment not found.");
    }

    const [statusResolution, providerDefinition, agentName] = await Promise.all([
      this.resolveEnvironmentStatus(transactionProvider, environment),
      environment.providerDefinitionId
        ? this.computeProviderDefinitionService.loadDefinitionById(
          transactionProvider,
          companyId,
          environment.providerDefinitionId,
        )
        : Promise.resolve(null),
      transactionProvider.transaction(async (tx) => {
        const selectableDatabase = tx as SelectableDatabase;
        const rows = await selectableDatabase
          .select({
            name: agents.name,
          })
          .from(agents)
          .where(eq(agents.id, environment.agentId))
          .orderBy(asc(agents.name)) as Array<{ name: string }>;
        return rows[0]?.name ?? null;
      }),
    ]);

    return {
      ...environment,
      agentName,
      cpuUsedPct: environment.cpuUsedPct ?? null,
      diskUsedBytes: environment.diskUsedBytes ?? null,
      memUsedBytes: environment.memUsedBytes ?? null,
      metricsSampledAt: environment.metricsSampledAt ?? null,
      providerDefinitionName: providerDefinition?.name ?? null,
      status: statusResolution.status,
      statusErrorMessage: statusResolution.statusErrorMessage,
    };
  }

  /**
   * Converts provider status lookup failures into a recoverable payload so detail pages can still
   * render the environment record while surfacing the provider error inline to operators.
   */
  private async resolveEnvironmentStatus(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<{
    status: string;
    statusErrorMessage: string | null;
  }> {
    try {
      return {
        status: await this.providerRegistry.get(environment.provider).getEnvironmentStatus(transactionProvider, environment),
        statusErrorMessage: null,
      };
    } catch (error) {
      return {
        status: "unknown",
        statusErrorMessage: this.resolveStatusErrorMessage(error),
      };
    }
  }

  private resolveStatusErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const errorMessage = error.message.trim();
      if (errorMessage.length > 0) {
        return errorMessage;
      }
    }

    return "Live environment status could not be loaded.";
  }

  async listMetricSamples(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    environmentId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<EnvironmentMetricSampleRecord[]> {
    const environment = await this.catalogService.loadEnvironmentById(transactionProvider, environmentId);
    if (!environment || environment.companyId !== companyId) {
      throw new Error("Environment not found.");
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select({
          cpuUsedPct: agentEnvironmentMetricSamples.cpuUsedPct,
          diskUsedBytes: agentEnvironmentMetricSamples.diskUsedBytes,
          memUsedBytes: agentEnvironmentMetricSamples.memUsedBytes,
          sampledAt: agentEnvironmentMetricSamples.sampledAt,
        })
        .from(agentEnvironmentMetricSamples)
        .where(and(
          eq(agentEnvironmentMetricSamples.companyId, companyId),
          eq(agentEnvironmentMetricSamples.environmentId, environmentId),
          gte(agentEnvironmentMetricSamples.sampledAt, startTime),
          lte(agentEnvironmentMetricSamples.sampledAt, endTime),
        ))
        .orderBy(asc(agentEnvironmentMetricSamples.sampledAt)) as Promise<EnvironmentMetricSampleRecord[]>;
    });
  }
}
