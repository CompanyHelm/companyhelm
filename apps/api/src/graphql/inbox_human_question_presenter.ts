import { injectable } from "inversify";
import type { AgentInboxHumanQuestionRecord } from "../services/inbox/service.ts";

export type GraphqlInboxHumanQuestionProposalRecord = {
  answerText: string;
  cons: string[];
  id: string;
  pros: string[];
  rating: number;
};

export type GraphqlInboxHumanQuestionAnswerRecord = {
  answeredByUserId: string;
  createdAt: string;
  customAnswerText: string | null;
  finalAnswerText: string;
  id: string;
  selectedProposalId: string | null;
};

export type GraphqlInboxHumanQuestionRecord = {
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

/**
 * Serializes inbox human-question records into the GraphQL shape so query, mutation, and
 * subscription resolvers can share one canonical mapping.
 */
@injectable()
export class InboxHumanQuestionPresenter {
  serialize(question: AgentInboxHumanQuestionRecord): GraphqlInboxHumanQuestionRecord {
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

  serializeMany(questions: ReadonlyArray<AgentInboxHumanQuestionRecord>): GraphqlInboxHumanQuestionRecord[] {
    return questions.map((question) => this.serialize(question));
  }
}
