import { inject, injectable } from "inversify";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import { GraphqlRequestContext } from "../graphql_request_context.ts";
import { RedisPatternAsyncIterator } from "../subscriptions/redis_pattern_async_iterator.ts";
import { SessionProcessPubSubNames } from "../../services/agent/session/process/pub_sub_names.ts";
import { SessionReadService } from "../../services/agent/session/read_service.ts";
import { ArtifactService } from "../../services/artifact_service.ts";

type SessionArtifactsUpdatedArguments = {
  sessionId: string;
};

/**
 * Streams the full session artifact list for one session whenever artifact storage changes. Redis
 * only carries the invalidation signal; each event reloads the latest canonical artifact rows from
 * Postgres so the chats sidebar can replace its artifact strip in one pass.
 */
@injectable()
export class SessionArtifactsUpdatedSubscriptionResolver {
  private readonly artifactService: ArtifactService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly sessionReadService: SessionReadService;

  constructor(
    @inject(ArtifactService) artifactService: ArtifactService = new ArtifactService(),
    @inject(SessionProcessPubSubNames)
    sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
  ) {
    this.artifactService = artifactService;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
    this.sessionReadService = sessionReadService;
  }

  subscribe = (
    _root: unknown,
    arguments_: SessionArtifactsUpdatedArguments,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ SessionArtifactsUpdated: GraphqlArtifactRecord[] }> => {
    return this.subscribeInternal(arguments_, context);
  };

  resolve(payload: { SessionArtifactsUpdated: GraphqlArtifactRecord[] }): GraphqlArtifactRecord[] {
    return payload.SessionArtifactsUpdated;
  }

  private async *subscribeInternal(
    arguments_: SessionArtifactsUpdatedArguments,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ SessionArtifactsUpdated: GraphqlArtifactRecord[] }> {
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
      this.sessionProcessPubSubNames.getSessionArtifactsUpdatePattern(sessionId),
    );

    try {
      for await (const event of iterator) {
        void event;
        const artifacts = await this.artifactService.listArtifacts(requestContext.app_runtime_transaction_provider, {
          companyId: requestContext.authSession.company.id,
          scopeType: "session",
          sessionId,
        });

        yield {
          SessionArtifactsUpdated: artifacts.map((artifact) => GraphqlArtifactPresenter.present(artifact)),
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
