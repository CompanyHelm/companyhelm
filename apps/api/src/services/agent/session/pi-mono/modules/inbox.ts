import { AgentInboxService } from "../../../inbox/service.ts";
import type { AgentToolProviderInterface } from "../../../tools/provider_interface.ts";
import { AgentInboxToolProvider } from "../../../tools/inbox/provider.ts";
import { AgentInboxToolService } from "../../../tools/inbox/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Owns the inbox escalation tools that let PI Mono ask a human question inside the current session
 * without the prompt pipeline having to understand inbox persistence details.
 */
export class InboxSessionModule extends AgentSessionModuleInterface {
  private readonly inboxService: AgentInboxService;

  constructor(inboxService: AgentInboxService) {
    super();
    this.inboxService = inboxService;
  }

  getName(): string {
    return "inbox";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentInboxToolProvider(
        new AgentInboxToolService(
          context.transactionProvider,
          context.companyId,
          context.agentId,
          context.sessionId,
          this.inboxService,
        ),
      ),
    ];
  }
}
