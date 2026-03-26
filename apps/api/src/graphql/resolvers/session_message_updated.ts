import { inject, injectable } from "inversify";
import { RedisPatternAsyncIterator } from "../subscriptions/redis_pattern_async_iterator.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  SessionReadService,
  type SessionMessageGraphqlRecord,
} from "../../services/agent/session/read_service.ts";
import { SessionProcessPubSubNames } from "../../services/agent/session/process/pub_sub_names.ts";

type SessionMessageUpdatedArguments = {
  sessionId: string;
};

/**
 * Streams transcript message changes for one selected session. The websocket subscriber listens to
 * Redis pattern events for that session and rehydrates each message from Postgres before emitting
 * it to the client.
 */
@injectable()
export class SessionMessageUpdatedSubscriptionResolver {
  private readonly sessionReadService: SessionReadService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;

  constructor(
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
    @inject(SessionProcessPubSubNames) sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
  ) {
    this.sessionReadService = sessionReadService;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
  }

  subscribe = (
    _root: unknown,
    arguments_: SessionMessageUpdatedArguments,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ SessionMessageUpdated: SessionMessageGraphqlRecord }> => {
    return this.subscribeInternal(arguments_, context);
  };

  resolve(payload: { SessionMessageUpdated: SessionMessageGraphqlRecord }): SessionMessageGraphqlRecord {
    return payload.SessionMessageUpdated;
  }

  private async *subscribeInternal(
    arguments_: SessionMessageUpdatedArguments,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ SessionMessageUpdated: SessionMessageGraphqlRecord }> {
    const requestContext = await this.resolveRequestContext(context);
    if (!requestContext.authSession?.company) {
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

    const iterator = new RedisPatternAsyncIterator(
      requestContext.redisCompanyScopedService,
      this.sessionProcessPubSubNames.getSessionMessageUpdatePattern(sessionId),
    );

    try {
      for await (const event of iterator) {
        const messageId = this.parseMessageId(event.channel);
        if (!messageId) {
          continue;
        }

        const messageRecord = await this.sessionReadService.getMessage(
          requestContext.app_runtime_transaction_provider,
          requestContext.authSession.company.id,
          messageId,
        );
        if (!messageRecord || messageRecord.sessionId !== sessionId) {
          continue;
        }

        yield {
          SessionMessageUpdated: messageRecord,
        };
      }
    } finally {
      await iterator.return();
    }
  }

  private parseMessageId(channel: string): string | null {
    const segments = channel.split(":");
    return segments.length >= 7 ? segments[5] ?? null : null;
  }

  private async resolveRequestContext(context: GraphqlRequestContext): Promise<GraphqlRequestContext> {
    if (context.authSession?.company && context.app_runtime_transaction_provider && context.redisCompanyScopedService) {
      return context;
    }

    return await context.resolveSubscriptionContext?.() ?? context;
  }
}
