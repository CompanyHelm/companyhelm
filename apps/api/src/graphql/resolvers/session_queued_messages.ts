import { inject, injectable } from "inversify";
import { SessionQueuedMessageGraphqlPresenter, type SessionQueuedMessageGraphqlRecord } from "../../services/agent/session/process/queued_message_graphql_presenter.ts";
import { SessionQueuedMessageService } from "../../services/agent/session/process/queued_messages.ts";
import { SessionReadService } from "../../services/agent/session/read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type SessionQueuedMessagesQueryArguments = {
  sessionId: string;
};

/**
 * Lists queued rows for one session while they still live in Postgres. Pending rows are still
 * batchable; processing rows have already been claimed by a worker and are waiting for PI Mono to
 * emit the user message that will remove them from the queue.
 */
@injectable()
export class SessionQueuedMessagesQueryResolver {
  private readonly presenter: SessionQueuedMessageGraphqlPresenter;
  private readonly sessionQueuedMessageService: SessionQueuedMessageService;
  private readonly sessionReadService: SessionReadService;

  constructor(
    @inject(SessionQueuedMessageGraphqlPresenter)
    presenter: SessionQueuedMessageGraphqlPresenter = new SessionQueuedMessageGraphqlPresenter(),
    @inject(SessionQueuedMessageService)
    sessionQueuedMessageService: SessionQueuedMessageService = new SessionQueuedMessageService(),
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
  ) {
    this.presenter = presenter;
    this.sessionQueuedMessageService = sessionQueuedMessageService;
    this.sessionReadService = sessionReadService;
  }

  execute = async (
    _root: unknown,
    arguments_: SessionQueuedMessagesQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<SessionQueuedMessageGraphqlRecord[]> => {
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
    if (!sessionRecord) {
      throw new Error("Session not found.");
    }

    const queuedMessages = await this.sessionQueuedMessageService.listQueued(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      sessionId,
    );

    return this.presenter.serializeMany(queuedMessages);
  };
}
