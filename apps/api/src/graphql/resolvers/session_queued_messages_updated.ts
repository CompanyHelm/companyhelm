import { inject, injectable } from "inversify";
import { SessionQueuedMessageGraphqlPresenter, type SessionQueuedMessageGraphqlRecord } from "../../services/agent/session/process/queued_message_graphql_presenter.ts";
import { SessionProcessPubSubNames } from "../../services/agent/session/process/pub_sub_names.ts";
import { SessionQueuedMessageService } from "../../services/agent/session/process/queued_messages.ts";
import { SessionReadService } from "../../services/agent/session/read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { RedisPatternAsyncIterator } from "../subscriptions/redis_pattern_async_iterator.ts";

type SessionQueuedMessagesUpdatedArguments = {
  sessionId: string;
};

/**
 * Streams the live queued rows for one session. Redis only signals that queue state changed; the
 * resolver reloads the full queue snapshot from Postgres so the web composer can replace its local
 * queue strip without inferring claims, dispatches, deletes, or steer toggles client-side.
 */
@injectable()
export class SessionQueuedMessagesUpdatedSubscriptionResolver {
  private readonly presenter: SessionQueuedMessageGraphqlPresenter;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly sessionQueuedMessageService: SessionQueuedMessageService;
  private readonly sessionReadService: SessionReadService;

  constructor(
    @inject(SessionQueuedMessageGraphqlPresenter)
    presenter: SessionQueuedMessageGraphqlPresenter = new SessionQueuedMessageGraphqlPresenter(),
    @inject(SessionProcessPubSubNames)
    sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
    @inject(SessionQueuedMessageService)
    sessionQueuedMessageService: SessionQueuedMessageService = new SessionQueuedMessageService(),
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
  ) {
    this.presenter = presenter;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
    this.sessionQueuedMessageService = sessionQueuedMessageService;
    this.sessionReadService = sessionReadService;
  }

  subscribe = (
    _root: unknown,
    arguments_: SessionQueuedMessagesUpdatedArguments,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ SessionQueuedMessagesUpdated: SessionQueuedMessageGraphqlRecord[] }> => {
    return this.subscribeInternal(arguments_, context);
  };

  resolve(payload: { SessionQueuedMessagesUpdated: SessionQueuedMessageGraphqlRecord[] }): SessionQueuedMessageGraphqlRecord[] {
    return payload.SessionQueuedMessagesUpdated;
  }

  private async *subscribeInternal(
    arguments_: SessionQueuedMessagesUpdatedArguments,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ SessionQueuedMessagesUpdated: SessionQueuedMessageGraphqlRecord[] }> {
    const requestContext = await this.resolveRequestContext(context);
    if (!requestContext.authSession?.company || !requestContext.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!requestContext.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (!requestContext.redisCompanyScopedService) {
      throw new Error("Subscription transport is not configured.");
    }

    const sessionId = String(arguments_.sessionId || "").trim();
    if (sessionId.length === 0) {
      throw new Error("sessionId is required.");
    }
    const sessionRecord = await this.sessionReadService.getSession(
      requestContext.app_runtime_transaction_provider,
      requestContext.authSession.company.id,
      sessionId,
      requestContext.authSession.user.id,
    );
    if (!sessionRecord) {
      throw new Error("Session not found.");
    }

    const iterator = new RedisPatternAsyncIterator(
      requestContext.redisCompanyScopedService,
      this.sessionProcessPubSubNames.getSessionQueuedMessagesUpdatePattern(sessionId),
    );

    try {
      for await (const event of iterator) {
        void event;
        const queuedMessages = await this.sessionQueuedMessageService.listQueued(
          requestContext.app_runtime_transaction_provider,
          requestContext.authSession.company.id,
          sessionId,
        );

        yield {
          SessionQueuedMessagesUpdated: this.presenter.serializeMany(queuedMessages),
        };
      }
    } finally {
      await iterator.return();
    }
  }

  private async resolveRequestContext(context: GraphqlRequestContext): Promise<GraphqlRequestContext> {
    if (context.authSession?.company && context.app_runtime_transaction_provider && context.redisCompanyScopedService) {
      return context;
    }

    return await context.resolveSubscriptionContext?.() ?? context;
  }
}
