import { inject, injectable } from "inversify";
import { SessionProcessPubSubNames } from "../../services/agent/session/process/pub_sub_names.ts";
import { SessionReadService } from "../../services/agent/session/read_service.ts";
import { AgentInboxService } from "../../services/inbox/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  GraphqlInboxHumanQuestionRecord,
  InboxHumanQuestionPresenter,
} from "./inbox_human_question_presenter.ts";
import { RedisPatternAsyncIterator } from "../subscriptions/redis_pattern_async_iterator.ts";

type SessionInboxHumanQuestionsUpdatedArguments = {
  sessionId: string;
};

/**
 * Streams the canonical open human-question snapshot for one session. Redis only signals that the
 * session's inbox slice changed; the resolver reloads the current open questions from Postgres so
 * the chat UI can replace its inline question state without inferring create, resolve, or dismiss
 * transitions client-side.
 */
@injectable()
export class SessionInboxHumanQuestionsUpdatedSubscriptionResolver {
  private readonly inboxService: AgentInboxService;
  private readonly presenter: InboxHumanQuestionPresenter;
  private readonly sessionReadService: SessionReadService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;

  constructor(
    @inject(AgentInboxService) inboxService: AgentInboxService,
    @inject(InboxHumanQuestionPresenter)
    presenter: InboxHumanQuestionPresenter = new InboxHumanQuestionPresenter(),
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
    @inject(SessionProcessPubSubNames)
    sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
  ) {
    this.inboxService = inboxService;
    this.presenter = presenter;
    this.sessionReadService = sessionReadService;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
  }

  subscribe = (
    _root: unknown,
    arguments_: SessionInboxHumanQuestionsUpdatedArguments,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ SessionInboxHumanQuestionsUpdated: GraphqlInboxHumanQuestionRecord[] }> => {
    return this.subscribeInternal(arguments_, context);
  };

  resolve(payload: {
    SessionInboxHumanQuestionsUpdated: GraphqlInboxHumanQuestionRecord[];
  }): GraphqlInboxHumanQuestionRecord[] {
    return payload.SessionInboxHumanQuestionsUpdated;
  }

  private async *subscribeInternal(
    arguments_: SessionInboxHumanQuestionsUpdatedArguments,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ SessionInboxHumanQuestionsUpdated: GraphqlInboxHumanQuestionRecord[] }> {
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
      this.sessionProcessPubSubNames.getSessionInboxHumanQuestionsUpdatePattern(sessionId),
    );

    try {
      for await (const event of iterator) {
        void event;
        const questions = await this.inboxService.listOpenHumanQuestionsForSession(
          requestContext.app_runtime_transaction_provider,
          requestContext.authSession.company.id,
          sessionId,
        );

        yield {
          SessionInboxHumanQuestionsUpdated: this.presenter.serializeMany(questions),
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
