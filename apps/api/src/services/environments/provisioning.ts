import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type {
  AgentComputeProviderInterface,
  AgentEnvironmentRecord,
} from "./providers/provider_interface.ts";
import { AgentComputeProviderRegistry } from "./providers/provider_registry.ts";
import { AgentEnvironmentWorkspacePath } from "./workspace_path.ts";

/**
 * Applies the shared post-create bootstrap steps for newly provisioned environments. The provider
 * is responsible for creating compute, while this class prepares the environment filesystem so
 * later tool calls can assume a stable workspace layout.
 */
@injectable()
export class AgentEnvironmentProvisioning {
  private readonly providerRegistry: AgentComputeProviderRegistry;

  constructor(
    @inject(AgentComputeProviderRegistry)
    providerRegistryOrProvider: AgentComputeProviderRegistry | AgentComputeProviderInterface,
  ) {
    this.providerRegistry = AgentEnvironmentProvisioning.isProvider(providerRegistryOrProvider)
      ? {
          get() {
            return providerRegistryOrProvider;
          },
        } as never
      : providerRegistryOrProvider;
  }

  async provision(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void> {
    const environmentShell = await this.providerRegistry
      .get(environment.provider)
      .createShell(transactionProvider, environment);
    const result = await environmentShell.executeCommand(
      `sh -lc 'mkdir -p ${AgentEnvironmentWorkspacePath.get()}'`,
    );
    if (result.exitCode !== 0) {
      throw new Error(`Failed to provision environment workspace: ${result.stdout}`);
    }
  }

  private static isProvider(value: unknown): value is AgentComputeProviderInterface {
    return typeof value === "object"
      && value !== null
      && "getProvider" in value
      && typeof value.getProvider === "function";
  }
}
