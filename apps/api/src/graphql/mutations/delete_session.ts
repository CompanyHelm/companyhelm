import { inject, injectable } from "inversify";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";
import {
  SessionReadService,
  type SessionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteSessionMutationArguments = {
  input: {
    sessionId: string;
  };
};

/**
 * Permanently removes one archived session after loading its current snapshot so clients can drop
 * the deleted chat from local state without issuing a second list query.
 */
@injectable()
export class DeleteSessionMutation extends Mutation<DeleteSessionMutationArguments, SessionGraphqlRecord> {
  private readonly sessionManagerService: SessionManagerService;
  private readonly sessionReadService: SessionReadService;

  constructor(
    @inject(SessionManagerService) sessionManagerService: SessionManagerService,
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
  ) {
    super();
    this.sessionManagerService = sessionManagerService;
    this.sessionReadService = sessionReadService;
  }

  protected resolve = async (
    arguments_: DeleteSessionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<SessionGraphqlRecord> => {
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.sessionId.length === 0) {
      throw new Error("sessionId is required.");
    }

    const sessionRecord = await this.sessionReadService.getSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.sessionId,
      context.authSession.user.id,
    );
    if (!sessionRecord) {
      throw new Error("Session not found.");
    }

    await this.sessionManagerService.deleteSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.sessionId,
      context.authSession.user.id,
    );

    return sessionRecord;
  };
}
