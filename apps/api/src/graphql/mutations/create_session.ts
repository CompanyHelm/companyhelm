import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";

type CreateSessionMutationArguments = {
  input: {
    agentId: string;
    modelId?: string | null;
    reasoningLevel?: string | null;
    userMessage: string;
  };
};

type GraphqlSessionRecord = {
  id: string;
  agentId: string;
  modelId: string;
  reasoningLevel: string;
  userMessage: string;
  createdAt: string;
  updatedAt: string;
};

type ServiceSessionRecord = {
  id: string;
  agentId: string;
  currentModelId: string;
  currentReasoningLevel: string;
  userMessage: string;
  createdAt: Date;
  updatedAt: Date;
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
      arguments_.input.modelId,
      arguments_.input.reasoningLevel,
    );

    return CreateSessionMutation.serializeRecord(sessionRecord);
  };

  private static serializeRecord(sessionRecord: ServiceSessionRecord): GraphqlSessionRecord {
    return {
      id: sessionRecord.id,
      agentId: sessionRecord.agentId,
      modelId: sessionRecord.currentModelId,
      reasoningLevel: sessionRecord.currentReasoningLevel,
      userMessage: sessionRecord.userMessage,
      createdAt: sessionRecord.createdAt.toISOString(),
      updatedAt: sessionRecord.updatedAt.toISOString(),
    };
  }
}
