import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";

type ForkSessionMutationArguments = {
  input: {
    sessionId: string;
    turnId: string;
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
 * Branches one new persisted agent session from a completed turn checkpoint so the user can keep
 * exploring an alternate path without mutating the original session history.
 */
@injectable()
export class ForkSessionMutation extends Mutation<ForkSessionMutationArguments, GraphqlSessionRecord> {
  private readonly sessionManagerService: SessionManagerService;

  constructor(@inject(SessionManagerService) sessionManagerService: SessionManagerService) {
    super();
    this.sessionManagerService = sessionManagerService;
  }

  protected resolve = async (
    arguments_: ForkSessionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSessionRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.sessionId.length === 0) {
      throw new Error("sessionId is required.");
    }
    if (arguments_.input.turnId.length === 0) {
      throw new Error("turnId is required.");
    }

    const sessionRecord = await this.sessionManagerService.forkSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.sessionId,
      arguments_.input.turnId,
      context.authSession.user.id,
    );

    return ForkSessionMutation.serializeRecord(sessionRecord);
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
