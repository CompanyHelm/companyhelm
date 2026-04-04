import { inject, injectable } from "inversify";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";
import {
  SessionReadService,
  type SessionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateSessionTitleMutationArguments = {
  input: {
    sessionId: string;
    title?: string | null;
  };
};

/**
 * Persists a user-defined chat title for a session so the UI can override the inferred label
 * without changing the transcript-derived fallback.
 */
@injectable()
export class UpdateSessionTitleMutation extends Mutation<
  UpdateSessionTitleMutationArguments,
  SessionGraphqlRecord
> {
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
    arguments_: UpdateSessionTitleMutationArguments,
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

    await this.sessionManagerService.updateSessionTitle(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.sessionId,
      arguments_.input.title ?? null,
    );

    const sessionRecord = await this.sessionReadService.getSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.sessionId,
      context.authSession.user.id,
    );
    if (!sessionRecord) {
      throw new Error("Session not found.");
    }

    return sessionRecord;
  };
}
