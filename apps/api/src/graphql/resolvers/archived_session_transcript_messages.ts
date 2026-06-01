import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  SessionReadService,
  type SessionTranscriptMessageConnectionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";

type ArchivedSessionTranscriptMessagesArguments = {
  sessionId: string;
  first: number;
  after?: string | null;
};

/**
 * Provides oldest-to-newest archived transcript pagination for the read-only archive detail page.
 * Active chats keep their live newest-first transcript loader, while archived deep links can show
 * the beginning of long conversations first and append later messages as the viewer scrolls down.
 */
@injectable()
export class ArchivedSessionTranscriptMessagesQueryResolver {
  private readonly sessionReadService: SessionReadService;

  constructor(@inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService()) {
    this.sessionReadService = sessionReadService;
  }

  execute = async (
    _root: unknown,
    arguments_: ArchivedSessionTranscriptMessagesArguments,
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

    return this.sessionReadService.listArchivedTranscriptMessagesForward(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      sessionId,
      context.authSession.user.id,
      arguments_.first,
      arguments_.after,
    );
  };
}
