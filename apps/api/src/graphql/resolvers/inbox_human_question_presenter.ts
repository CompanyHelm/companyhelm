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
 * Serializes inbox human question records from the service layer into the ISO-string GraphQL shape
 * shared by the query and subscription resolvers. Keeping this in one presenter avoids drifting
 * field formatting between the initial query snapshot and later live updates.
 */
export class InboxHumanQuestionPresenter {
  serializeMany(records: ServiceQuestionRecord[]): GraphqlInboxHumanQuestionRecord[] {
    return records.map((record) => this.serialize(record));
  }

  serialize(question: ServiceQuestionRecord): GraphqlInboxHumanQuestionRecord {
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
