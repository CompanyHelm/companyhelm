import { inject, injectable } from "inversify";
import { AgentInboxService } from "../../services/inbox/service.ts";
import {
  GraphqlInboxHumanQuestionRecord,
  InboxHumanQuestionPresenter,
} from "../inbox_human_question_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DismissInboxHumanQuestionMutationArguments = {
  input: {
    inboxItemId: string;
  };
};

/**
 * Lets the operator clear an inbox question without steering a human answer back into the agent
 * session. This is used when the question is no longer relevant and should simply leave the inbox.
 */
@injectable()
export class DismissInboxHumanQuestionMutation extends Mutation<
  DismissInboxHumanQuestionMutationArguments,
  GraphqlInboxHumanQuestionRecord
> {
  private readonly inboxService: AgentInboxService;
  private readonly presenter: InboxHumanQuestionPresenter;

  constructor(
    @inject(AgentInboxService) inboxService: AgentInboxService,
    @inject(InboxHumanQuestionPresenter) presenter: InboxHumanQuestionPresenter = new InboxHumanQuestionPresenter(),
  ) {
    super();
    this.inboxService = inboxService;
    this.presenter = presenter;
  }

  protected resolve = async (
    arguments_: DismissInboxHumanQuestionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlInboxHumanQuestionRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const dismissedQuestion = await this.inboxService.dismissHumanQuestion(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        inboxItemId: arguments_.input.inboxItemId,
        userId: context.authSession.user.id,
      },
    );

    return this.presenter.serialize(dismissedQuestion);
  };
}
