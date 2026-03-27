import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { AgentSandboxService } from "../../sandbox_service.ts";
import { AgentComputeProviderInterface } from "../provider_interface.ts";
import { AgentComputeDaytonaSandbox } from "./daytona_sandbox.ts";

/**
 * Bridges the generic compute-provider contract onto the current Daytona-backed sandbox service.
 * The lease and provisioning rules stay in AgentSandboxService; this class only exposes them
 * through the agent compute abstraction.
 */
@injectable()
export class AgentComputeDaytonaProvider extends AgentComputeProviderInterface {
  private readonly agentSandboxService: AgentSandboxService;

  constructor(@inject(AgentSandboxService) agentSandboxService: AgentSandboxService) {
    super();
    this.agentSandboxService = agentSandboxService;
  }

  async getSandboxForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ) {
    const sandboxRecord = await this.agentSandboxService.getSandboxForSession(
      transactionProvider,
      sessionId,
      agentId,
    );

    return new AgentComputeDaytonaSandbox(sandboxRecord);
  }
}
