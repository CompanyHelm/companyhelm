import { inject, injectable } from "inversify";
import {
  SessionReadService,
  type SessionMessageGraphqlRecord,
} from "../../services/agent/session/read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

/**
 * Lists persisted transcript messages for the authenticated company. The resolver folds text
 * content blocks onto each message row so the chats page can render a transcript without knowing
 * about the lower-level `message_contents` table shape.
 */
@injectable()
export class SessionMessagesQueryResolver extends Resolver<SessionMessageGraphqlRecord[]> {
  private readonly sessionReadService: SessionReadService;

  constructor(@inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService()) {
    super();
    this.sessionReadService = sessionReadService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<SessionMessageGraphqlRecord[]> => {
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return this.sessionReadService.listMessages(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      context.authSession.user.id,
    );
  };
}
