import { inject, injectable } from "inversify";
import { AgentInboxService } from "../../services/inbox/service.ts";
import {
  GraphqlInboxHumanQuestionRecord,
  InboxHumanQuestionPresenter,
} from "../inbox_human_question_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type ResolveInboxHumanQuestionMutationArguments = {
  input: {
    customAnswerText?: string | null;
    inboxItemId: string;
    proposalId?: string | null;
  };
};

/**
 * Records the human's answer for one inbox question and immediately steers that answer back into
 * the originating chat session so the agent can continue from a regular user-message path.
 */
@injectable()
export class ResolveInboxHumanQuestionMutation extends Mutation<
  ResolveInboxHumanQuestionMutationArguments,
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
    arguments_: ResolveInboxHumanQuestionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlInboxHumanQuestionRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const resolvedQuestion = await this.inboxService.resolveHumanQuestion(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        customAnswerText: arguments_.input.customAnswerText,
        inboxItemId: arguments_.input.inboxItemId,
        proposalId: arguments_.input.proposalId,
        userId: context.authSession.user.id,
      },
    );

    return this.presenter.serialize(resolvedQuestion);
  };
}
