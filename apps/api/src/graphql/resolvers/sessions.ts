import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { agentSessions } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type SessionRecord = {
  id: string;
  agentId: string;
  currentModelId: string;
  currentReasoningLevel: string;
  userMessage: string;
  createdAt: Date;
  updatedAt: Date;
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

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Lists the persisted sessions for the authenticated company so the web app can build the chat
 * sidebar without needing a separate session lookup per agent.
 */
@injectable()
export class SessionsQueryResolver extends Resolver<GraphqlSessionRecord[]> {
  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlSessionRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const sessionRecords = await selectableDatabase
        .select({
          id: agentSessions.id,
          agentId: agentSessions.agentId,
          currentModelId: agentSessions.currentModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          userMessage: agentSessions.user_message,
          createdAt: agentSessions.created_at,
          updatedAt: agentSessions.updated_at,
        })
        .from(agentSessions)
        .where(eq(agentSessions.companyId, context.authSession.company.id)) as SessionRecord[];

      return [...sessionRecords]
        .sort((leftSession, rightSession) => rightSession.updatedAt.getTime() - leftSession.updatedAt.getTime())
        .map((sessionRecord) => SessionsQueryResolver.serializeRecord(sessionRecord));
    });
  };

  private static serializeRecord(sessionRecord: SessionRecord): GraphqlSessionRecord {
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
