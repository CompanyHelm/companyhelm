import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { AgentComputeSandboxInterface } from "./sandbox_interface.ts";

/**
 * Resolves the compute sandbox handle that should execute work for one agent session. The returned
 * sandbox may be lazy and defer provider provisioning until one of its tools is actually used.
 */
export abstract class AgentComputeProviderInterface {
  /**
   * Returns the sandbox handle for the session. Implementations validate that the session belongs
   * to the agent, but they may postpone the actual provider lease or creation until a sandbox tool
   * such as command execution or PTY interaction is invoked.
   */
  abstract getSandboxForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ): Promise<AgentComputeSandboxInterface>;
}
