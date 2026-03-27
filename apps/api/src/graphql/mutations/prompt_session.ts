import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";

type PromptSessionMutationArguments = {
  input: {
    id: string;
    shouldSteer?: boolean | null;
    userMessage: string;
  };
};

type GraphqlSessionRecord = {
  agentId: string;
  createdAt: string;
  id: string;
  inferredTitle: string | null;
  isThinking: boolean;
  modelId: string;
  reasoningLevel: string;
  status: string;
  thinkingText: string | null;
  updatedAt: string;
  userSetTitle: string | null;
};

type ServiceSessionRecord = {
  agentId: string;
  createdAt: Date;
  currentModelId: string;
  currentReasoningLevel: string;
  id: string;
  inferredTitle: string | null;
  isThinking: boolean;
  status: string;
  thinkingText: string | null;
  updatedAt: Date;
  userSetTitle: string | null;
};

/**
 * Queues one new user message for an existing session. Its scope is validating the session prompt
 * mutation input and returning the updated persisted session row after the queue ingress succeeds.
 */
@injectable()
export class PromptSessionMutation extends Mutation<PromptSessionMutationArguments, GraphqlSessionRecord> {
  private readonly sessionManagerService: SessionManagerService;

  constructor(@inject(SessionManagerService) sessionManagerService: SessionManagerService) {
    super();
    this.sessionManagerService = sessionManagerService;
  }

  protected resolve = async (
    arguments_: PromptSessionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSessionRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.id.length === 0) {
      throw new Error("id is required.");
    }
    if (arguments_.input.userMessage.length === 0) {
      throw new Error("userMessage is required.");
    }

    const sessionRecord = await this.sessionManagerService.prompt(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
      arguments_.input.userMessage,
      arguments_.input.shouldSteer === true,
    );

    return PromptSessionMutation.serializeRecord(sessionRecord);
  };

  private static serializeRecord(sessionRecord: ServiceSessionRecord): GraphqlSessionRecord {
    return {
      id: sessionRecord.id,
      agentId: sessionRecord.agentId,
      modelId: sessionRecord.currentModelId,
      reasoningLevel: sessionRecord.currentReasoningLevel,
      inferredTitle: sessionRecord.inferredTitle,
      isThinking: sessionRecord.isThinking,
      status: sessionRecord.status,
      thinkingText: sessionRecord.thinkingText,
      createdAt: sessionRecord.createdAt.toISOString(),
      updatedAt: sessionRecord.updatedAt.toISOString(),
      userSetTitle: sessionRecord.userSetTitle,
    };
  }
}
