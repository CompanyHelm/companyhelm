import { inject, injectable } from "inversify";
import { E2bEnvironmentMetricsAdapter } from "../providers/e2b/metrics_adapter.ts";
import type { ComputeProvider } from "../providers/provider_interface.ts";
import type { EnvironmentMetricsAdapterInterface } from "./adapter_interface.ts";

/**
 * Centralizes metrics adapter lookup so worker code can stay provider-agnostic while still
 * delegating telemetry fetches to the provider-specific implementation.
 */
@injectable()
export class EnvironmentMetricsAdapterRegistry {
  private readonly adapterByProvider: Map<ComputeProvider, EnvironmentMetricsAdapterInterface>;

  constructor(
    @inject(E2bEnvironmentMetricsAdapter) e2bAdapter: E2bEnvironmentMetricsAdapter,
  ) {
    this.adapterByProvider = new Map([
      [e2bAdapter.getProvider(), e2bAdapter],
    ]);
  }

  get(provider: ComputeProvider): EnvironmentMetricsAdapterInterface {
    const adapter = this.adapterByProvider.get(provider);
    if (!adapter) {
      throw new Error(`Environment metrics adapter for provider ${provider} is not configured.`);
    }

    return adapter;
  }
}
