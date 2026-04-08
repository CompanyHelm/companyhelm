import { inject, injectable } from "inversify";
import {
  AgentConversationService,
  type AgentConversationMessageRecord,
} from "../../services/conversations/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type AgentConversationMessagesArguments = {
  conversationId?: string | null;
};

type GraphqlAgentConversationMessage = {
  authorAgentId: string;
  authorAgentName: string;
  authorParticipantId: string;
  authorSessionId: string;
  authorSessionTitle: string;
  conversationId: string;
  createdAt: string;
  id: string;
  text: string;
};

/**
 * Lists the canonical messages for one conversation so the web transcript can render the thread
 * directly from the persisted cross-agent messaging records.
 */
@injectable()
export class AgentConversationMessagesQueryResolver {
  private readonly agentConversationService: AgentConversationService;

  constructor(
    @inject(AgentConversationService) agentConversationService: AgentConversationService,
  ) {
    this.agentConversationService = agentConversationService;
  }

  execute = async (
    _root: unknown,
    arguments_: AgentConversationMessagesArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlAgentConversationMessage[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const messages = await this.agentConversationService.listMessages(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.conversationId ?? null,
    );

    return messages.map(AgentConversationMessagesQueryResolver.serializeMessage);
  };

  private static serializeMessage(message: AgentConversationMessageRecord): GraphqlAgentConversationMessage {
    return {
      authorAgentId: message.authorAgentId,
      authorAgentName: message.authorAgentName,
      authorParticipantId: message.authorParticipantId,
      authorSessionId: message.authorSessionId,
      authorSessionTitle: message.authorSessionTitle,
      conversationId: message.conversationId,
      createdAt: message.createdAt.toISOString(),
      id: message.id,
      text: message.text,
    };
  }
}
