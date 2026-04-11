import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { SessionManagerService } from "../agent/session/session_manager_service.ts";
import { AgentConversationCommandService } from "./command_service.ts";
import { ConversationDeliveryPlanner } from "./delivery_planner.ts";
import { AgentConversationQueryService } from "./query_service.ts";

export type AgentConversationSendMessageInput = {
  companyId: string;
  sourceAgentId: string;
  sourceSessionId: string;
  targetAgentId?: string | null;
  targetSessionId?: string | null;
  text: string;
};

export type AgentConversationSendMessageResult = {
  conversationId: string;
  createdNewTargetSession: boolean;
  messageId: string;
  targetAgentId: string;
  targetSessionId: string;
};

export type AgentConversationDeleteInput = {
  companyId: string;
  conversationId: string;
};

export type AgentConversationParticipantRecord = {
  agentId: string;
  agentName: string;
  id: string;
  sessionId: string;
  sessionTitle: string;
};

export type AgentConversationRecord = {
  createdAt: Date;
  id: string;
  latestMessageAt: Date | null;
  latestMessagePreview: string | null;
  participants: AgentConversationParticipantRecord[];
  updatedAt: Date;
};

export type AgentConversationMessageRecord = {
  authorAgentId: string;
  authorAgentName: string;
  authorParticipantId: string;
  authorSessionId: string;
  authorSessionTitle: string;
  conversationId: string;
  createdAt: Date;
  id: string;
  text: string;
};

type PageInfoRecord = {
  endCursor: string | null;
  hasNextPage: boolean;
};

type AgentConversationMessageEdgeRecord = {
  cursor: string;
  node: AgentConversationMessageRecord;
};

export type AgentConversationMessageConnectionRecord = {
  edges: AgentConversationMessageEdgeRecord[];
  pageInfo: PageInfoRecord;
};

/**
 * Preserves the public agent-conversation API while delegating command and query behavior to
 * narrower collaborators that keep the send, read, delete, and delivery-planning code paths isolated.
 */
@injectable()
export class AgentConversationService {
  private readonly commandService: AgentConversationCommandService;
  private readonly queryService: AgentConversationQueryService;

  constructor(
    @inject(ApiLogger) logger: ApiLogger,
    @inject(SessionManagerService) sessionManagerService: SessionManagerService,
  ) {
    const deliveryPlanner = new ConversationDeliveryPlanner(sessionManagerService);
    this.commandService = new AgentConversationCommandService(
      logger,
      sessionManagerService,
      deliveryPlanner,
    );
    this.queryService = new AgentConversationQueryService();
  }

  async sendMessage(
    transactionProvider: TransactionProviderInterface,
    input: AgentConversationSendMessageInput,
  ): Promise<AgentConversationSendMessageResult> {
    return this.commandService.sendMessage(transactionProvider, input);
  }

  async listConversations(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<AgentConversationRecord[]> {
    return this.queryService.listConversations(transactionProvider, companyId);
  }

  async listMessages(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    conversationId?: string | null,
    first?: number | null,
    after?: string | null,
  ): Promise<AgentConversationMessageConnectionRecord> {
    return this.queryService.listMessages(transactionProvider, companyId, conversationId, first, after);
  }

  async deleteConversation(
    transactionProvider: TransactionProviderInterface,
    input: AgentConversationDeleteInput,
  ): Promise<{ id: string }> {
    return this.commandService.deleteConversation(transactionProvider, input);
  }
}
