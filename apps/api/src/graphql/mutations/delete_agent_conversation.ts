import { inject, injectable } from "inversify";
import { AgentConversationService } from "../../services/conversations/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteAgentConversationMutationArguments = {
  input: {
    conversationId: string;
  };
};

type GraphqlDeleteAgentConversationPayload = {
  deletedConversationId: string;
};

/**
 * Deletes one canonical agent conversation so Relay clients can remove the matching list entry and
 * transcript without waiting for a follow-up refetch.
 */
@injectable()
export class DeleteAgentConversationMutation extends Mutation<
  DeleteAgentConversationMutationArguments,
  GraphqlDeleteAgentConversationPayload
> {
  private readonly agentConversationService: AgentConversationService;

  constructor(
    @inject(AgentConversationService)
    agentConversationService: AgentConversationService = {
      async deleteConversation() {
        throw new Error("AgentConversation service is not configured.");
      },
    } as never,
  ) {
    super();
    this.agentConversationService = agentConversationService;
  }

  protected resolve = async (
    arguments_: DeleteAgentConversationMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlDeleteAgentConversationPayload> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.conversationId.length === 0) {
      throw new Error("conversationId is required.");
    }

    const deletedConversation = await this.agentConversationService.deleteConversation(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        conversationId: arguments_.input.conversationId,
      },
    );

    return {
      deletedConversationId: deletedConversation.id,
    };
  };
}
