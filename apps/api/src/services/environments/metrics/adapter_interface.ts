import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import type { AgentEnvironmentRecord, ComputeProvider } from "../providers/provider_interface.ts";

export type EnvironmentMetricsSample = {
  cpuUsedPct: number | null;
  diskUsedBytes: number | null;
  memUsedBytes: number | null;
  sampledAt: Date;
};

/**
 * Normalizes provider-native environment telemetry into the compact metric shape CompanyHelm
 * persists for current usage summaries and short rolling trend graphs.
 */
export interface EnvironmentMetricsAdapterInterface {
  /**
   * Returns the provider identifier handled by this adapter so the registry can route persisted
   * environments to the correct implementation.
   */
  getProvider(): ComputeProvider;

  /**
   * Loads the newest provider-side metrics sample for one environment. Returning null signals that
   * the provider has not emitted any metrics yet, which is common immediately after provisioning.
   */
  getLatestMetrics(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<EnvironmentMetricsSample | null>;
}
