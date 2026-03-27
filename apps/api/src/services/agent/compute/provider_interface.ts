import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { AgentComputeSandboxInterface } from "./sandbox_interface.ts";

/**
 * Resolves the compute sandbox that should execute work for one agent session. The provider owns
 * the mapping between persisted session state and the concrete runtime that can perform compute.
 */
export abstract class AgentComputeProviderInterface {
  /**
   * Returns the sandbox currently assigned to the session, provisioning or reclaiming one when the
   * backing provider requires it. Callers pass both ids so implementations can validate ownership
   * before handing out a leased runtime handle.
   */
  abstract getSandboxForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ): Promise<AgentComputeSandboxInterface>;
}
