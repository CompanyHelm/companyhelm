import { inject, injectable } from "inversify";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type ArchiveSessionMutationArguments = {
  input: {
    id: string;
  };
};

type GraphqlSessionRecord = {
  id: string;
  agentId: string;
  modelId: string;
  reasoningLevel: string;
  isThinking: boolean;
  status: string;
  thinkingText: string | null;
  createdAt: string;
  updatedAt: string;
};

type ServiceSessionRecord = {
  id: string;
  agentId: string;
  currentModelId: string;
  currentModelProviderCredentialModelId: string;
  currentReasoningLevel: string;
  isThinking: boolean;
  status: string;
  thinkingText: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@injectable()
export class ArchiveSessionMutation extends Mutation<ArchiveSessionMutationArguments, GraphqlSessionRecord> {
  private readonly sessionManagerService: SessionManagerService;

  constructor(@inject(SessionManagerService) sessionManagerService: SessionManagerService) {
    super();
    this.sessionManagerService = sessionManagerService;
  }

  protected resolve = async (
    arguments_: ArchiveSessionMutationArguments,
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

    const sessionRecord = await this.sessionManagerService.archiveSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
    );

    return ArchiveSessionMutation.serializeRecord(sessionRecord);
  };

  private static serializeRecord(sessionRecord: ServiceSessionRecord): GraphqlSessionRecord {
    return {
      id: sessionRecord.id,
      agentId: sessionRecord.agentId,
      modelId: sessionRecord.currentModelId,
      reasoningLevel: sessionRecord.currentReasoningLevel,
      isThinking: sessionRecord.isThinking,
      status: sessionRecord.status,
      thinkingText: sessionRecord.thinkingText,
      createdAt: sessionRecord.createdAt.toISOString(),
      updatedAt: sessionRecord.updatedAt.toISOString(),
    };
  }
}
