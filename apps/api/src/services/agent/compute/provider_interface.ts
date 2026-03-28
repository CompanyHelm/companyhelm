import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentInterface } from "./environment_interface.ts";

/**
 * Resolves the compute environment handle that should execute work for one agent session. The
 * returned environment may be lazy and defer provider provisioning until one of its tools is
 * actually used.
 */
export abstract class AgentComputeProviderInterface {
  /**
   * Returns the environment handle for the session. Implementations validate that the session
   * belongs to the agent, but they may postpone the actual provider lease or creation until a
   * sandbox tool such as command execution or PTY interaction is invoked.
   */
  abstract getEnvironmentForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ): Promise<AgentEnvironmentInterface>;
}
