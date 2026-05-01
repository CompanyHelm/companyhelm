import { Sandbox as E2bSandbox } from "e2b";
import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { ComputeProviderDefinitionService } from "../../../compute_provider_definitions/service.ts";
import type {
  EnvironmentMetricsAdapterInterface,
  EnvironmentMetricsSample,
} from "../../metrics/adapter_interface.ts";
import type { AgentEnvironmentRecord } from "../provider_interface.ts";

/**
 * Adapts E2B's sandbox metrics API into the latest-sample metric shape CompanyHelm persists. E2B
 * returns a rolling list, so this adapter reduces it to the newest available point.
 */
@injectable()
export class E2bEnvironmentMetricsAdapter implements EnvironmentMetricsAdapterInterface {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;

  constructor(
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
  ) {
    this.computeProviderDefinitionService = computeProviderDefinitionService;
  }

  getProvider(): "e2b" {
    return "e2b";
  }

  async getLatestMetrics(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<EnvironmentMetricsSample | null> {
    if (!environment.providerDefinitionId) {
      throw new Error("Environment provider definition is missing.");
    }

    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      transactionProvider,
      environment.companyId,
      environment.providerDefinitionId,
    );
    if (definition.provider !== "e2b") {
      throw new Error("Compute provider definition does not belong to E2B.");
    }

    const metrics = await E2bSandbox.getMetrics(environment.providerEnvironmentId, {
      apiKey: definition.apiKey,
    });
    if (metrics.length === 0) {
      return null;
    }

    const latestMetric = metrics.reduce((latest, current) => {
      const latestTimestamp = latest.timestamp.getTime();
      const currentTimestamp = current.timestamp.getTime();
      return currentTimestamp > latestTimestamp ? current : latest;
    });

    return {
      cpuUsedPct: latestMetric.cpuUsedPct ?? null,
      diskUsedBytes: latestMetric.diskUsed ?? null,
      memUsedBytes: latestMetric.memUsed ?? null,
      sampledAt: latestMetric.timestamp,
    };
  }
}
