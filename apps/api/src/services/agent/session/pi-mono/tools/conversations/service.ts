import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import {
  AgentConversationService,
  type AgentConversationSendMessageResult,
} from "../../../../../conversations/service.ts";

export type AgentConversationToolSendMessageInput = {
  targetAgentId?: string | null;
  targetSessionId?: string | null;
  text: string;
};

/**
 * Binds agent-to-agent conversation delivery to the current prompt context so the public tool only
 * has to describe the destination and message text rather than threading source identifiers around.
 */
export class AgentConversationToolService {
  private readonly agentConversationService: AgentConversationService;
  private readonly agentId: string;
  private readonly companyId: string;
  private readonly sessionId: string;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    sessionId: string,
    agentConversationService: AgentConversationService,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.agentId = agentId;
    this.sessionId = sessionId;
    this.agentConversationService = agentConversationService;
  }

  async sendMessage(input: AgentConversationToolSendMessageInput): Promise<AgentConversationSendMessageResult> {
    return this.agentConversationService.sendMessage(this.transactionProvider, {
      companyId: this.companyId,
      sourceAgentId: this.agentId,
      sourceSessionId: this.sessionId,
      targetAgentId: input.targetAgentId,
      targetSessionId: input.targetSessionId,
      text: input.text,
    });
  }
}
