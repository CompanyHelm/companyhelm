import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  SessionReadService,
  type SessionTranscriptMessageConnectionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";

type SessionTranscriptMessagesArguments = {
  sessionId: string;
  first: number;
  after?: string | null;
};

/**
 * Lists transcript messages for one persisted session. The resolver is session-scoped so the chats
 * page can fetch only the selected transcript instead of loading every message in the company.
 */
@injectable()
export class SessionTranscriptMessagesQueryResolver {
  private readonly sessionReadService: SessionReadService;

  constructor(@inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService()) {
    this.sessionReadService = sessionReadService;
  }

  execute = async (
    _root: unknown,
    arguments_: SessionTranscriptMessagesArguments,
    context: GraphqlRequestContext,
  ): Promise<SessionTranscriptMessageConnectionGraphqlRecord> => {
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const sessionId = String(arguments_.sessionId || "").trim();
    if (sessionId.length === 0) {
      throw new Error("sessionId is required.");
    }

    return this.sessionReadService.listTranscriptMessages(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      sessionId,
      context.authSession.user.id,
      arguments_.first,
      arguments_.after,
    );
  };
}
