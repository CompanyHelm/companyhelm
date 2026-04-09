import { inject, injectable } from "inversify";
import { AgentInboxService } from "../../services/inbox/service.ts";
import {
  GraphqlInboxHumanQuestionRecord,
  InboxHumanQuestionPresenter,
} from "../inbox_human_question_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

/**
 * Exposes the open inbox questions that agents have escalated to humans. The inbox UI reads this
 * list to show pending decisions without having to inspect raw transcript tool calls.
 */
@injectable()
export class InboxHumanQuestionsQueryResolver extends Resolver<GraphqlInboxHumanQuestionRecord[]> {
  private readonly inboxService: AgentInboxService;
  private readonly presenter: InboxHumanQuestionPresenter;

  constructor(
    @inject(AgentInboxService) inboxService: AgentInboxService,
    @inject(InboxHumanQuestionPresenter)
    presenter: InboxHumanQuestionPresenter = new InboxHumanQuestionPresenter(),
  ) {
    super();
    this.inboxService = inboxService;
    this.presenter = presenter;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlInboxHumanQuestionRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const questions = await this.inboxService.listOpenHumanQuestions(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );

    return this.presenter.serializeMany(questions);
  };
}
