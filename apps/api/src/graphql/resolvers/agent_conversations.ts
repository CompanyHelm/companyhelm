import { inject, injectable } from "inversify";
import {
  AgentConversationService,
  type AgentConversationRecord,
} from "../../services/agent/conversations/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type GraphqlAgentConversationParticipant = {
  agentId: string;
  agentName: string;
  id: string;
  sessionId: string;
  sessionTitle: string;
};

type GraphqlAgentConversation = {
  createdAt: string;
  id: string;
  latestMessageAt: string | null;
  latestMessagePreview: string | null;
  participants: GraphqlAgentConversationParticipant[];
  updatedAt: string;
};

/**
 * Lists company-scoped agent-to-agent conversations so the conversations page can render the
 * available threads without reconstructing participants or preview metadata client-side.
 */
@injectable()
export class AgentConversationsQueryResolver extends Resolver<GraphqlAgentConversation[]> {
  private readonly agentConversationService: AgentConversationService;

  constructor(
    @inject(AgentConversationService) agentConversationService: AgentConversationService,
  ) {
    super();
    this.agentConversationService = agentConversationService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlAgentConversation[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const conversations = await this.agentConversationService.listConversations(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );

    return conversations.map(AgentConversationsQueryResolver.serializeConversation);
  };

  private static serializeConversation(conversation: AgentConversationRecord): GraphqlAgentConversation {
    return {
      createdAt: conversation.createdAt.toISOString(),
      id: conversation.id,
      latestMessageAt: conversation.latestMessageAt?.toISOString() ?? null,
      latestMessagePreview: conversation.latestMessagePreview,
      participants: conversation.participants,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }
}
