import { inject, injectable } from "inversify";
import { AgentInboxService } from "../../services/inbox/service.ts";
import { AgentInboxPubSubNames } from "../../services/inbox/pub_sub_names.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  GraphqlInboxHumanQuestionRecord,
  InboxHumanQuestionPresenter,
} from "../inbox_human_question_presenter.ts";
import { RedisPatternAsyncIterator } from "../subscriptions/redis_pattern_async_iterator.ts";

/**
 * Streams the current open human-question list for the authenticated company. Redis only signals
 * that the inbox changed; subscribers always reload canonical open questions from Postgres.
 */
@injectable()
export class InboxHumanQuestionsUpdatedSubscriptionResolver {
  private readonly inboxPubSubNames: AgentInboxPubSubNames;
  private readonly inboxService: AgentInboxService;
  private readonly presenter: InboxHumanQuestionPresenter;

  constructor(
    @inject(AgentInboxService) inboxService: AgentInboxService,
    @inject(AgentInboxPubSubNames) inboxPubSubNames: AgentInboxPubSubNames = new AgentInboxPubSubNames(),
    @inject(InboxHumanQuestionPresenter) presenter: InboxHumanQuestionPresenter = new InboxHumanQuestionPresenter(),
  ) {
    this.inboxService = inboxService;
    this.inboxPubSubNames = inboxPubSubNames;
    this.presenter = presenter;
  }

  subscribe = (
    _root: unknown,
    _arguments: Record<string, never>,
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ InboxHumanQuestionsUpdated: GraphqlInboxHumanQuestionRecord[] }> => {
    return this.subscribeInternal(context);
  };

  resolve(payload: { InboxHumanQuestionsUpdated: GraphqlInboxHumanQuestionRecord[] }): GraphqlInboxHumanQuestionRecord[] {
    return payload.InboxHumanQuestionsUpdated;
  }

  private async *subscribeInternal(
    context: GraphqlRequestContext,
  ): AsyncIterableIterator<{ InboxHumanQuestionsUpdated: GraphqlInboxHumanQuestionRecord[] }> {
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

    const iterator = new RedisPatternAsyncIterator(
      requestContext.redisCompanyScopedService,
      this.inboxPubSubNames.getHumanQuestionsUpdatePattern(),
    );

    try {
      for await (const event of iterator) {
        void event;

        const questions = await this.inboxService.listOpenHumanQuestions(
          requestContext.app_runtime_transaction_provider,
          requestContext.authSession.company.id,
        );

        yield {
          InboxHumanQuestionsUpdated: this.presenter.serializeMany(questions),
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
