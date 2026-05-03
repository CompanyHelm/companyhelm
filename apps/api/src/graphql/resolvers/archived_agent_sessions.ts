import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  SessionReadService,
  type SessionConnectionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";

type ArchivedAgentSessionsArguments = {
  agentId: string;
  first: number;
  after?: string | null;
};

/**
 * Provides a cursor-paginated archived chat list for one agent so slow archive views can load a
 * small ordered slice first, then request older archived sessions as the operator scrolls.
 */
@injectable()
export class ArchivedAgentSessionsQueryResolver {
  private readonly sessionReadService: SessionReadService;

  constructor(@inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService()) {
    this.sessionReadService = sessionReadService;
  }

  execute = async (
    _root: unknown,
    arguments_: ArchivedAgentSessionsArguments,
    context: GraphqlRequestContext,
  ): Promise<SessionConnectionGraphqlRecord> => {
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const agentId = String(arguments_.agentId || "").trim();
    if (agentId.length === 0) {
      throw new Error("agentId is required.");
    }

    return this.sessionReadService.listArchivedAgentSessions(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      agentId,
      context.authSession.user.id,
      arguments_.first,
      arguments_.after,
    );
  };
}
