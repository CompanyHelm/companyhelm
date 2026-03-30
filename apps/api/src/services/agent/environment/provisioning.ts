import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import {
  AgentComputeProviderInterface,
  type AgentEnvironmentRecord,
} from "../compute/provider_interface.ts";

/**
 * Applies the shared post-create bootstrap steps for newly provisioned environments. The provider
 * is responsible for creating compute, while this class prepares the environment filesystem so
 * later tool calls can assume a stable workspace layout.
 */
@injectable()
export class AgentEnvironmentProvisioning {
  private readonly provider: AgentComputeProviderInterface;

  constructor(
    @inject(AgentComputeProviderInterface) provider: AgentComputeProviderInterface,
  ) {
    this.provider = provider;
  }

  async provision(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void> {
    const environmentShell = await this.provider.createShell(transactionProvider, environment);
    const result = await environmentShell.executeCommand("mkdir -p /workspace");
    if (result.exitCode !== 0) {
      throw new Error(`Failed to provision environment workspace: ${result.stdout}`);
    }
  }
}
