import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  SessionReadService,
  type SessionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";

type ArchivedSessionArguments = {
  sessionId: string;
};

/**
 * Loads a single archived chat for read-only inspection. The active chats list intentionally omits
 * archived sessions, so this resolver gives deep links a narrow, status-checked lookup path without
 * making archived records look active in the main chat workspace.
 */
@injectable()
export class ArchivedSessionQueryResolver {
  private readonly sessionReadService: SessionReadService;

  constructor(@inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService()) {
    this.sessionReadService = sessionReadService;
  }

  execute = async (
    _root: unknown,
    arguments_: ArchivedSessionArguments,
    context: GraphqlRequestContext,
  ): Promise<SessionGraphqlRecord> => {
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

    const sessionRecord = await this.sessionReadService.getSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      sessionId,
      context.authSession.user.id,
    );
    if (!sessionRecord || sessionRecord.status !== "archived") {
      throw new Error("Archived chat not found.");
    }

    return sessionRecord;
  };
}
