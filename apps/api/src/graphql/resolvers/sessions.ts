import { inject, injectable } from "inversify";
import {
  SessionReadService,
  type SessionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

/**
 * Lists the persisted sessions for the authenticated company so the web app can build the chat
 * sidebar without needing a separate session lookup per agent.
 */
@injectable()
export class SessionsQueryResolver extends Resolver<SessionGraphqlRecord[]> {
  private readonly sessionReadService: SessionReadService;

  constructor(@inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService()) {
    super();
    this.sessionReadService = sessionReadService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<SessionGraphqlRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return this.sessionReadService.listSessions(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );
  };
}
