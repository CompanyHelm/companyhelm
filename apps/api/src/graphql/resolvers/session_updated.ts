import { inject, injectable } from "inversify";
import { RedisPatternAsyncIterator } from "../subscriptions/redis_pattern_async_iterator.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  SessionReadService,
  type SessionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";

/**
 * Streams session-level change notifications for the authenticated company. Redis only provides the
 * event fanout; each notification is reloaded from Postgres so subscribers receive the canonical
 * session row instead of cached event payloads.
 */
@injectable()
export class SessionUpdatedSubscriptionResolver {
  private readonly sessionReadService: SessionReadService;

  constructor(@inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService()) {
    this.sessionReadService = sessionReadService;
  }

  subscribe = async function* (
    this: SessionUpdatedSubscriptionResolver,
    _root: unknown,
    _arguments: Record<string, never>,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ SessionUpdated: SessionGraphqlRecord }> {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (!context.redisCompanyScopedService) {
      throw new Error("Subscription transport is not configured.");
    }

    const iterator = new RedisPatternAsyncIterator(
      context.redisCompanyScopedService,
      "session:*:update",
    );

    try {
      for await (const event of iterator) {
        const sessionId = this.parseSessionId(event.channel);
        if (!sessionId) {
          continue;
        }

        const sessionRecord = await this.sessionReadService.getSession(
          context.app_runtime_transaction_provider,
          context.authSession.company.id,
          sessionId,
        );
        if (!sessionRecord) {
          continue;
        }

        yield {
          SessionUpdated: sessionRecord,
        };
      }
    } finally {
      await iterator.return();
    }
  };

  resolve(payload: { SessionUpdated: SessionGraphqlRecord }): SessionGraphqlRecord {
    return payload.SessionUpdated;
  }

  private parseSessionId(channel: string): string | null {
    const segments = channel.split(":");
    return segments.length >= 5 ? segments[3] ?? null : null;
  }
}
