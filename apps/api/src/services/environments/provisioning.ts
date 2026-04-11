import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type {
  AgentComputeProviderInterface,
  AgentEnvironmentRecord,
} from "./providers/provider_interface.ts";
import { AgentComputeProviderRegistry } from "./providers/provider_registry.ts";
import { AgentEnvironmentBootstrapService } from "./bootstrap_service.ts";

/**
 * Applies the shared post-create bootstrap steps for newly provisioned environments. The provider
 * is responsible for creating compute, while this class prepares the environment filesystem so
 * later tool calls can assume a stable workspace layout.
 */
@injectable()
export class AgentEnvironmentProvisioning {
  private readonly bootstrapService: AgentEnvironmentBootstrapService;

  constructor(
    @inject(AgentComputeProviderRegistry)
    providerRegistryOrProvider: AgentComputeProviderRegistry | AgentComputeProviderInterface,
    @inject(AgentEnvironmentBootstrapService)
    bootstrapService?: AgentEnvironmentBootstrapService,
  ) {
    const providerRegistry = AgentEnvironmentProvisioning.isProvider(providerRegistryOrProvider)
      ? {
          get() {
            return providerRegistryOrProvider;
          },
        } as never
      : providerRegistryOrProvider;
    this.bootstrapService = bootstrapService ?? new AgentEnvironmentBootstrapService(providerRegistry);
  }

  async provision(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void> {
    await this.bootstrapService.bootstrap(transactionProvider, environment);
  }

  private static isProvider(value: unknown): value is AgentComputeProviderInterface {
    return typeof value === "object"
      && value !== null
      && "getProvider" in value
      && typeof value.getProvider === "function";
  }
}
