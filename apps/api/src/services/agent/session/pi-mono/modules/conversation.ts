import { AgentConversationService } from "../../../../conversations/service.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentConversationToolProvider } from "../tools/conversations/provider.ts";
import { AgentConversationToolService } from "../tools/conversations/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Supplies the agent-to-agent conversation tool slice so session-to-session messaging remains a
 * standalone capability that can later grow its own prompt guidance and activation rules.
 */
export class ConversationSessionModule extends AgentSessionModuleInterface {
  private readonly agentConversationService: AgentConversationService;

  constructor(agentConversationService: AgentConversationService) {
    super();
    this.agentConversationService = agentConversationService;
  }

  getName(): string {
    return "conversation";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentConversationToolProvider(
        new AgentConversationToolService(
          context.transactionProvider,
          context.companyId,
          context.agentId,
          context.sessionId,
          this.agentConversationService,
        ),
      ),
    ];
  }
}
