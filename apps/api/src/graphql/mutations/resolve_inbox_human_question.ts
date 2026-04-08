import { inject, injectable } from "inversify";
import { AgentInboxService } from "../../services/inbox/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type ResolveInboxHumanQuestionMutationArguments = {
  input: {
    customAnswerText?: string | null;
    inboxItemId: string;
    proposalId?: string | null;
  };
};

type GraphqlInboxHumanQuestionProposalRecord = {
  answerText: string;
  cons: string[];
  id: string;
  pros: string[];
  rating: number;
};

type GraphqlInboxHumanQuestionAnswerRecord = {
  answeredByUserId: string;
  createdAt: string;
  customAnswerText: string | null;
  finalAnswerText: string;
  id: string;
  selectedProposalId: string | null;
};

type GraphqlInboxHumanQuestionRecord = {
  agentId: string;
  agentName: string;
  allowCustomAnswer: boolean;
  answer: GraphqlInboxHumanQuestionAnswerRecord | null;
  createdAt: string;
  id: string;
  proposals: GraphqlInboxHumanQuestionProposalRecord[];
  questionText: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  sessionId: string;
  sessionTitle: string;
  status: string;
  summary: string;
  title: string;
  updatedAt: string;
};

type ServiceProposalRecord = {
  answerText: string;
  cons: string[];
  id: string;
  pros: string[];
  rating: number;
};

type ServiceAnswerRecord = {
  answeredByUserId: string;
  createdAt: Date;
  customAnswerText: string | null;
  finalAnswerText: string;
  id: string;
  selectedProposalId: string | null;
};

type ServiceQuestionRecord = {
  agentId: string;
  agentName: string;
  allowCustomAnswer: boolean;
  answer: ServiceAnswerRecord | null;
  createdAt: Date;
  id: string;
  proposals: ServiceProposalRecord[];
  questionText: string;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  sessionId: string;
  sessionTitle: string;
  status: string;
  summary: string;
  title: string;
  updatedAt: Date;
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

  constructor(@inject(AgentInboxService) inboxService: AgentInboxService) {
    super();
    this.inboxService = inboxService;
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

    return ResolveInboxHumanQuestionMutation.serializeRecord(resolvedQuestion);
  };

  private static serializeRecord(question: ServiceQuestionRecord): GraphqlInboxHumanQuestionRecord {
    return {
      agentId: question.agentId,
      agentName: question.agentName,
      allowCustomAnswer: question.allowCustomAnswer,
      answer: question.answer
        ? {
          answeredByUserId: question.answer.answeredByUserId,
          createdAt: question.answer.createdAt.toISOString(),
          customAnswerText: question.answer.customAnswerText,
          finalAnswerText: question.answer.finalAnswerText,
          id: question.answer.id,
          selectedProposalId: question.answer.selectedProposalId,
        }
        : null,
      createdAt: question.createdAt.toISOString(),
      id: question.id,
      proposals: question.proposals.map((proposal) => ({
        answerText: proposal.answerText,
        cons: proposal.cons,
        id: proposal.id,
        pros: proposal.pros,
        rating: proposal.rating,
      })),
      questionText: question.questionText,
      resolvedAt: question.resolvedAt?.toISOString() ?? null,
      resolvedByUserId: question.resolvedByUserId,
      sessionId: question.sessionId,
      sessionTitle: question.sessionTitle,
      status: question.status,
      summary: question.summary,
      title: question.title,
      updatedAt: question.updatedAt.toISOString(),
    };
  }
}
