import { inject, injectable } from "inversify";
import { AgentComputeE2bProvider } from "./e2b/e2b_provider.ts";
import type { AgentComputeProviderInterface, ComputeProvider } from "./provider_interface.ts";

/**
 * Resolves the concrete compute provider implementation for persisted environment rows and for new
 * provisioning requests. This keeps provider routing in one place instead of scattering provider
 * switches across the environment services and GraphQL mutations.
 */
@injectable()
export class AgentComputeProviderRegistry {
  private readonly providerById: Map<ComputeProvider, AgentComputeProviderInterface>;

  constructor(
    @inject(AgentComputeE2bProvider) e2bProvider: AgentComputeE2bProvider,
  ) {
    this.providerById = new Map([
      [e2bProvider.getProvider(), e2bProvider],
    ]);
  }

  get(provider: ComputeProvider): AgentComputeProviderInterface {
    const resolvedProvider = this.providerById.get(provider);
    if (!resolvedProvider) {
      throw new Error(`Compute provider ${provider} is not configured.`);
    }

    return resolvedProvider;
  }
}
