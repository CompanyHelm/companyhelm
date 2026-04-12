import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";
import { SessionManagerService, type SessionPromptImageInput } from "../../services/agent/session/session_manager_service.ts";

type PromptSessionMutationArguments = {
  input: {
    id: string;
    images?: SessionPromptImageInput[] | null;
    modelProviderCredentialModelId?: string | null;
    reasoningLevel?: string | null;
    shouldSteer?: boolean | null;
    userMessage: string;
  };
};

type GraphqlSessionRecord = {
  agentId: string;
  createdAt: string;
  currentContextTokens: number | null;
  hasUnread: boolean;
  id: string;
  inferredTitle: string | null;
  isCompacting: boolean;
  isThinking: boolean;
  lastUserMessageAt: string | null;
  maxContextTokens: number | null;
  modelProviderCredentialModelId: string | null;
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
  currentContextTokens: number | null;
  currentModelId: string;
  currentModelProviderCredentialModelId: string;
  currentReasoningLevel: string;
  id: string;
  inferredTitle: string | null;
  isCompacting: boolean;
  isThinking: boolean;
  lastUserMessageAt: Date | null;
  maxContextTokens: number | null;
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
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.id.length === 0) {
      throw new Error("id is required.");
    }
    const userMessage = arguments_.input.userMessage;
    const images = arguments_.input.images ?? [];
    if (userMessage.trim().length === 0 && images.length === 0) {
      throw new Error("userMessage or images is required.");
    }

    const sessionRecord = await this.sessionManagerService.prompt(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
      userMessage,
      arguments_.input.modelProviderCredentialModelId,
      arguments_.input.reasoningLevel,
      arguments_.input.shouldSteer === true,
      images,
      context.authSession.user.id,
    );

    return PromptSessionMutation.serializeRecord(sessionRecord);
  };

  private static serializeRecord(sessionRecord: ServiceSessionRecord): GraphqlSessionRecord {
    return {
      id: sessionRecord.id,
      agentId: sessionRecord.agentId,
      currentContextTokens: sessionRecord.currentContextTokens,
      hasUnread: false,
      lastUserMessageAt: sessionRecord.lastUserMessageAt?.toISOString() ?? null,
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
