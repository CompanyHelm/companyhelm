import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";

type CreateSessionMutationArguments = {
  input: {
    agentId: string;
    modelProviderCredentialModelId?: string | null;
    reasoningLevel?: string | null;
    sessionId?: string | null;
    userMessage: string;
  };
};

type GraphqlSessionRecord = {
  id: string;
  agentId: string;
  currentContextTokens: number | null;
  hasUnread: boolean;
  modelProviderCredentialModelId: string | null;
  modelId: string;
  reasoningLevel: string;
  inferredTitle: string | null;
  isCompacting: boolean;
  isThinking: boolean;
  maxContextTokens: number | null;
  status: string;
  thinkingText: string | null;
  createdAt: string;
  updatedAt: string;
  userSetTitle: string | null;
};

type ServiceSessionRecord = {
  id: string;
  agentId: string;
  currentContextTokens: number | null;
  currentModelId: string;
  currentModelProviderCredentialModelId: string;
  currentReasoningLevel: string;
  inferredTitle: string | null;
  isCompacting: boolean;
  isThinking: boolean;
  maxContextTokens: number | null;
  status: string;
  thinkingText: string | null;
  createdAt: Date;
  updatedAt: Date;
  userSetTitle: string | null;
};

/**
 * Creates one persisted agent session for the authenticated company so the first user prompt and
 * the resolved runtime model settings are captured together from the start of the conversation.
 */
@injectable()
export class CreateSessionMutation extends Mutation<CreateSessionMutationArguments, GraphqlSessionRecord> {
  private readonly sessionManagerService: SessionManagerService;

  constructor(@inject(SessionManagerService) sessionManagerService: SessionManagerService) {
    super();
    this.sessionManagerService = sessionManagerService;
  }

  protected resolve = async (
    arguments_: CreateSessionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSessionRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.agentId.length === 0) {
      throw new Error("agentId is required.");
    }
    if (arguments_.input.userMessage.length === 0) {
      throw new Error("userMessage is required.");
    }

    const sessionRecord = await this.sessionManagerService.createSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.agentId,
      arguments_.input.userMessage,
      arguments_.input.modelProviderCredentialModelId,
      arguments_.input.reasoningLevel,
      arguments_.input.sessionId,
      context.authSession.user.id,
    );

    return CreateSessionMutation.serializeRecord(sessionRecord);
  };

  private static serializeRecord(sessionRecord: ServiceSessionRecord): GraphqlSessionRecord {
    return {
      id: sessionRecord.id,
      agentId: sessionRecord.agentId,
      currentContextTokens: sessionRecord.currentContextTokens,
      hasUnread: false,
      modelProviderCredentialModelId: sessionRecord.currentModelProviderCredentialModelId,
      modelId: sessionRecord.currentModelId,
      reasoningLevel: sessionRecord.currentReasoningLevel,
      inferredTitle: sessionRecord.inferredTitle,
      isCompacting: sessionRecord.isCompacting,
      isThinking: sessionRecord.isThinking,
      maxContextTokens: sessionRecord.maxContextTokens,
      status: sessionRecord.status,
      thinkingText: sessionRecord.thinkingText,
      createdAt: sessionRecord.createdAt.toISOString(),
      updatedAt: sessionRecord.updatedAt.toISOString(),
      userSetTitle: sessionRecord.userSetTitle,
    };
  }
}
