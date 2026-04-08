import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";
import {
  SessionReadService,
  type SessionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";

type ForkSessionMutationArguments = {
  input: {
    sessionId: string;
    turnId: string;
  };
};

/**
 * Branches one new persisted agent session from a completed turn checkpoint so the user can keep
 * exploring an alternate path without mutating the original session history.
 */
@injectable()
export class ForkSessionMutation extends Mutation<ForkSessionMutationArguments, SessionGraphqlRecord> {
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
    arguments_: ForkSessionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<SessionGraphqlRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.sessionId.length === 0) {
      throw new Error("sessionId is required.");
    }
    if (arguments_.input.turnId.length === 0) {
      throw new Error("turnId is required.");
    }

    const sessionRecord = await this.sessionManagerService.forkSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.sessionId,
      arguments_.input.turnId,
      context.authSession.user.id,
    );

    const nextSessionRecord = await this.sessionReadService.getSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      sessionRecord.id,
      context.authSession.user.id,
    );
    if (!nextSessionRecord) {
      throw new Error("Forked session not found.");
    }

    return nextSessionRecord;
  }
}
