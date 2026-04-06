import { inject, injectable } from "inversify";
import { SessionQueuedMessageGraphqlPresenter, type SessionQueuedMessageGraphqlRecord } from "../../services/agent/session/process/queued_message_graphql_presenter.ts";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteSessionQueuedMessageMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Deletes one pending non-steer queued prompt before a worker claims it. Steer rows stay protected
 * because they are expected to be consumed almost immediately once the live session is active.
 */
@injectable()
export class DeleteSessionQueuedMessageMutation extends Mutation<
  DeleteSessionQueuedMessageMutationArguments,
  SessionQueuedMessageGraphqlRecord
> {
  private readonly presenter: SessionQueuedMessageGraphqlPresenter;
  private readonly sessionManagerService: SessionManagerService;

  constructor(
    @inject(SessionQueuedMessageGraphqlPresenter)
    presenter: SessionQueuedMessageGraphqlPresenter = new SessionQueuedMessageGraphqlPresenter(),
    @inject(SessionManagerService)
    sessionManagerService: SessionManagerService = {
      async deleteQueuedMessage() {
        throw new Error("Session manager service is not configured.");
      },
    } as never,
  ) {
    super();
    this.presenter = presenter;
    this.sessionManagerService = sessionManagerService;
  }

  protected resolve = async (
    arguments_: DeleteSessionQueuedMessageMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<SessionQueuedMessageGraphqlRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const queuedMessageId = String(arguments_.input.id || "").trim();
    if (queuedMessageId.length === 0) {
      throw new Error("id is required.");
    }

    const queuedMessage = await this.sessionManagerService.deleteQueuedMessage(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      queuedMessageId,
    );

    return this.presenter.serialize(queuedMessage);
  };
}
