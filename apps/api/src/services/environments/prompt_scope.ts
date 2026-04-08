import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { AgentEnvironmentInterface } from "./providers/environment_interface.ts";
import { AgentEnvironmentAccessService } from "./access_service.ts";

/**
 * Caches the leased environment for one PI Mono prompt run. Multiple tool calls during the same
 * prompt reuse the same leased runtime, while cleanup returns the lease to warm idle state.
 */
export class AgentEnvironmentPromptScope {
  private readonly accessService: AgentEnvironmentAccessService;
  private readonly agentId: string;
  private readonly sessionId: string;
  private readonly transactionProvider: TransactionProviderInterface;
  private environmentPromise: Promise<AgentEnvironmentInterface> | null = null;

  constructor(
    transactionProvider: TransactionProviderInterface,
    accessService: AgentEnvironmentAccessService,
    agentId: string,
    sessionId: string,
  ) {
    this.transactionProvider = transactionProvider;
    this.accessService = accessService;
    this.agentId = agentId;
    this.sessionId = sessionId;
  }

  async dispose(): Promise<void> {
    const environment = this.environmentPromise ? await this.environmentPromise : null;
    if (environment) {
      await environment.dispose();
    }
    this.environmentPromise = null;
  }

  getEnvironment(): Promise<AgentEnvironmentInterface> {
    if (!this.environmentPromise) {
      this.environmentPromise = this.accessService.getEnvironmentForSession(
        this.transactionProvider,
        this.agentId,
        this.sessionId,
      );
    }

    return this.environmentPromise;
  }
}
