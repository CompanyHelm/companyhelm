import { inject, injectable } from "inversify";
import { SessionQueuedMessageGraphqlPresenter, type SessionQueuedMessageGraphqlRecord } from "../../services/agent/session/process/queued_message_graphql_presenter.ts";
import { SessionQueuedMessageService } from "../../services/agent/session/process/queued_messages.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type SessionQueuedMessagesQueryArguments = {
  sessionId: string;
};

/**
 * Lists the still-pending queued prompts for one session so the chats composer can show work that
 * has been accepted by the backend but has not been fully consumed by the worker yet.
 */
@injectable()
export class SessionQueuedMessagesQueryResolver {
  private readonly presenter: SessionQueuedMessageGraphqlPresenter;
  private readonly sessionQueuedMessageService: SessionQueuedMessageService;

  constructor(
    @inject(SessionQueuedMessageGraphqlPresenter)
    presenter: SessionQueuedMessageGraphqlPresenter = new SessionQueuedMessageGraphqlPresenter(),
    @inject(SessionQueuedMessageService)
    sessionQueuedMessageService: SessionQueuedMessageService = new SessionQueuedMessageService(),
  ) {
    this.presenter = presenter;
    this.sessionQueuedMessageService = sessionQueuedMessageService;
  }

  execute = async (
    _root: unknown,
    arguments_: SessionQueuedMessagesQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<SessionQueuedMessageGraphqlRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const sessionId = String(arguments_.sessionId || "").trim();
    if (sessionId.length === 0) {
      throw new Error("sessionId is required.");
    }

    const queuedMessages = await this.sessionQueuedMessageService.listPending(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      sessionId,
    );

    return this.presenter.serializeMany(queuedMessages);
  };
}
