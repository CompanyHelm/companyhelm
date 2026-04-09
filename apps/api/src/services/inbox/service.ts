import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agentInboxHumanQuestionAnswers,
  agentInboxHumanQuestionProposals,
  agentInboxHumanQuestions,
  agentInboxItems,
  agentSessions,
  agents,
} from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { SessionManagerService } from "../agent/session/session_manager_service.ts";
import { SessionProcessPubSubNames } from "../agent/session/process/pub_sub_names.ts";
import { RedisCompanyScopedService } from "../redis/company_scoped_service.ts";
import { RedisService } from "../redis/service.ts";

export type AgentInboxHumanQuestionProposalRecord = {
  answerText: string;
  cons: string[];
  createdAt: Date;
  id: string;
  inboxItemId: string;
  pros: string[];
  rating: number;
  sortOrder: number;
};

export type AgentInboxHumanQuestionAnswerRecord = {
  answeredByUserId: string;
  createdAt: Date;
  customAnswerText: string | null;
  finalAnswerText: string;
  id: string;
  inboxItemId: string;
  selectedProposalId: string | null;
};

export type AgentInboxHumanQuestionRecord = {
  agentId: string;
  agentName: string;
  allowCustomAnswer: boolean;
  answer: AgentInboxHumanQuestionAnswerRecord | null;
  companyId: string;
  createdAt: Date;
  id: string;
  kind: "human_question";
  proposals: AgentInboxHumanQuestionProposalRecord[];
  questionText: string;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  sessionId: string;
  sessionTitle: string;
  status: "open" | "resolved";
  summary: string;
  title: string;
  toolCallId: string | null;
  updatedAt: Date;
};

type InboxItemRow = {
  agentId: string;
  companyId: string;
  createdAt: Date;
  id: string;
  kind: "human_question";
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  sessionId: string;
  status: "open" | "resolved";
  summary: string;
  title: string;
  toolCallId: string | null;
  updatedAt: Date;
};

type HumanQuestionRow = {
  allowCustomAnswer: boolean;
  createdAt: Date;
  inboxItemId: string;
  questionText: string;
};

type AnswerRow = {
  answeredByUserId: string;
  createdAt: Date;
  customAnswerText: string | null;
  finalAnswerText: string;
  id: string;
  inboxItemId: string;
  selectedProposalId: string | null;
};

type AgentRow = {
  id: string;
  name: string;
};

type SessionRow = {
  agentId: string;
  id: string;
  inferredTitle: string | null;
  status: string;
  userSetTitle: string | null;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
      orderBy?(...values: unknown[]): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): Promise<unknown>;
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
};

/**
 * Owns the typed inbox records used when an agent needs a human decision. It persists the question,
 * proposed answers, and final human response, then feeds the chosen answer back into the session as
 * a steer message so the agent can continue without bespoke runtime blocking.
 */
@injectable()
export class AgentInboxService {
  private readonly redisService: RedisService;
  private readonly sessionManagerService: SessionManagerService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;

  constructor(
    @inject(SessionManagerService) sessionManagerService: SessionManagerService,
    @inject(RedisService) redisService: RedisService,
    @inject(SessionProcessPubSubNames)
    sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
  ) {
    this.redisService = redisService;
    this.sessionManagerService = sessionManagerService;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
  }

  async createHumanQuestion(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      allowCustomAnswer?: boolean;
      companyId: string;
      proposals: Array<{
        answerText: string;
        cons?: string[];
        pros?: string[];
        rating: number;
      }>;
      questionText: string;
      sessionId: string;
      title?: string | null;
      toolCallId?: string | null;
    },
  ): Promise<AgentInboxHumanQuestionRecord> {
    this.validateCreateInput(input);

    const inboxItemId = randomUUID();
    const allowCustomAnswer = input.allowCustomAnswer ?? true;
    const timestamp = new Date();
    const resolvedTitle = this.resolveTitle(input.title, input.questionText);
    const summary = this.resolveSummary(input.questionText);

    await transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const selectableDatabase = tx as SelectableDatabase;
      const [session] = await selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          id: agentSessions.id,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, input.companyId),
          eq(agentSessions.id, input.sessionId),
        )) as SessionRow[];
      if (!session) {
        throw new Error("Session not found.");
      }
      if (session.agentId !== input.agentId) {
        throw new Error("Session does not belong to the agent.");
      }

      await insertableDatabase.insert(agentInboxItems).values({
        agentId: input.agentId,
        companyId: input.companyId,
        createdAt: timestamp,
        id: inboxItemId,
        kind: "human_question",
        resolvedAt: null,
        resolvedByUserId: null,
        sessionId: input.sessionId,
        status: "open",
        summary,
        title: resolvedTitle,
        toolCallId: input.toolCallId ?? null,
        updatedAt: timestamp,
      });
      await insertableDatabase.insert(agentInboxHumanQuestions).values({
        allowCustomAnswer,
        createdAt: timestamp,
        inboxItemId,
        questionText: input.questionText,
      });

      if (input.proposals.length > 0) {
        await insertableDatabase.insert(agentInboxHumanQuestionProposals).values(input.proposals.map((proposal, index) => ({
          answerText: proposal.answerText,
          cons: proposal.cons ?? [],
          createdAt: timestamp,
          inboxItemId,
          pros: proposal.pros ?? [],
          rating: proposal.rating,
          sortOrder: index,
        })));
      }
    });

    const [createdQuestion] = await this.loadHumanQuestionsByIds(
      transactionProvider,
      input.companyId,
      [inboxItemId],
    );
    if (!createdQuestion) {
      throw new Error("Failed to create inbox question.");
    }

    await this.publishSessionHumanQuestionsUpdated(input.companyId, input.sessionId);
    return createdQuestion;
  }

  async listOpenHumanQuestions(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<AgentInboxHumanQuestionRecord[]> {
    return this.loadHumanQuestions(
      transactionProvider,
      companyId,
      "open",
    );
  }

  async listOpenHumanQuestionsForSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<AgentInboxHumanQuestionRecord[]> {
    return this.loadHumanQuestions(
      transactionProvider,
      companyId,
      "open",
      sessionId,
    );
  }

  async resolveHumanQuestion(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      customAnswerText?: string | null;
      inboxItemId: string;
      proposalId?: string | null;
      userId: string;
    },
  ): Promise<AgentInboxHumanQuestionRecord> {
    const { finalAnswerText, questionRecord } = await transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const [questionRecord] = await this.loadHumanQuestionsByIdsInTransaction(
        selectableDatabase,
        input.companyId,
        [input.inboxItemId],
      );
      if (!questionRecord) {
        throw new Error("Inbox item not found.");
      }
      if (questionRecord.status !== "open") {
        throw new Error("Inbox item has already been resolved.");
      }

      const customAnswerText = input.customAnswerText ?? null;
      const hasCustomAnswer = typeof customAnswerText === "string" && customAnswerText.trim().length > 0;
      const proposalId = input.proposalId ?? null;
      if (!hasCustomAnswer && !proposalId) {
        throw new Error("Select a proposal or provide a custom answer.");
      }
      if (hasCustomAnswer && proposalId) {
        throw new Error("Provide either a proposal or a custom answer, not both.");
      }
      if (hasCustomAnswer && !questionRecord.allowCustomAnswer) {
        throw new Error("This question does not accept custom answers.");
      }

      const selectedProposal = proposalId
        ? questionRecord.proposals.find((proposal) => proposal.id === proposalId) ?? null
        : null;
      if (proposalId && !selectedProposal) {
        throw new Error("Selected proposal not found.");
      }

      const finalAnswerText = selectedProposal?.answerText ?? customAnswerText;
      if (!finalAnswerText) {
        throw new Error("A final answer is required.");
      }

      const [session] = await selectableDatabase
        .select({
          status: agentSessions.status,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, input.companyId),
          eq(agentSessions.id, questionRecord.sessionId),
        )) as Array<{ status: string }>;
      if (!session) {
        throw new Error("Session not found.");
      }
      if (session.status === "archived") {
        throw new Error("Archived sessions cannot receive inbox answers.");
      }

      const timestamp = new Date();
      await insertableDatabase.insert(agentInboxHumanQuestionAnswers).values({
        answeredByUserId: input.userId,
        createdAt: timestamp,
        customAnswerText: selectedProposal ? null : customAnswerText,
        finalAnswerText,
        inboxItemId: input.inboxItemId,
        selectedProposalId: selectedProposal?.id ?? null,
      });
      await updatableDatabase
        .update(agentInboxItems)
        .set({
          resolvedAt: timestamp,
          resolvedByUserId: input.userId,
          status: "resolved",
          updatedAt: timestamp,
        })
        .where(and(
          eq(agentInboxItems.companyId, input.companyId),
          eq(agentInboxItems.id, input.inboxItemId),
        ));

      return {
        finalAnswerText,
        questionRecord,
      };
    });

    try {
      await this.sessionManagerService.prompt(
        transactionProvider,
        input.companyId,
        questionRecord.sessionId,
        this.formatSteerMessage(questionRecord.title, finalAnswerText),
        undefined,
        undefined,
        true,
      );
    } catch (error) {
      await this.reopenQuestion(transactionProvider, input.companyId, input.inboxItemId);
      throw error;
    }

    const [resolvedQuestion] = await this.loadHumanQuestionsByIds(
      transactionProvider,
      input.companyId,
      [input.inboxItemId],
    );
    if (!resolvedQuestion) {
      throw new Error("Resolved inbox item not found.");
    }

    await this.publishSessionHumanQuestionsUpdated(input.companyId, resolvedQuestion.sessionId);
    return resolvedQuestion;
  }

  async dismissHumanQuestion(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      inboxItemId: string;
      userId: string;
    },
  ): Promise<AgentInboxHumanQuestionRecord> {
    await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const [questionRecord] = await this.loadHumanQuestionsByIdsInTransaction(
        selectableDatabase,
        input.companyId,
        [input.inboxItemId],
      );
      if (!questionRecord) {
        throw new Error("Inbox item not found.");
      }
      if (questionRecord.status !== "open") {
        throw new Error("Inbox item has already been resolved.");
      }

      const timestamp = new Date();
      await updatableDatabase
        .update(agentInboxItems)
        .set({
          resolvedAt: timestamp,
          resolvedByUserId: input.userId,
          status: "resolved",
          updatedAt: timestamp,
        })
        .where(and(
          eq(agentInboxItems.companyId, input.companyId),
          eq(agentInboxItems.id, input.inboxItemId),
        ));
    });

    const [dismissedQuestion] = await this.loadHumanQuestionsByIds(
      transactionProvider,
      input.companyId,
      [input.inboxItemId],
    );
    if (!dismissedQuestion) {
      throw new Error("Resolved inbox item not found.");
    }

    await this.publishSessionHumanQuestionsUpdated(input.companyId, dismissedQuestion.sessionId);
    return dismissedQuestion;
  }

  private async reopenQuestion(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    inboxItemId: string,
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      await deletableDatabase
        .delete(agentInboxHumanQuestionAnswers)
        .where(eq(agentInboxHumanQuestionAnswers.inboxItemId, inboxItemId));
      await updatableDatabase
        .update(agentInboxItems)
        .set({
          resolvedAt: null,
          resolvedByUserId: null,
          status: "open",
          updatedAt: new Date(),
        })
        .where(and(
          eq(agentInboxItems.companyId, companyId),
          eq(agentInboxItems.id, inboxItemId),
        ));
    });
  }

  private async loadHumanQuestions(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    status: "open" | "resolved",
    sessionId: string | null = null,
  ): Promise<AgentInboxHumanQuestionRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      return this.loadHumanQuestionsInTransaction(tx as SelectableDatabase, companyId, {
        ids: null,
        sessionId,
        status,
      });
    });
  }

  private async loadHumanQuestionsByIds(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    ids: string[],
  ): Promise<AgentInboxHumanQuestionRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      return this.loadHumanQuestionsByIdsInTransaction(tx as SelectableDatabase, companyId, ids);
    });
  }

  private async loadHumanQuestionsByIdsInTransaction(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    ids: string[],
  ): Promise<AgentInboxHumanQuestionRecord[]> {
    return this.loadHumanQuestionsInTransaction(selectableDatabase, companyId, {
      ids,
      sessionId: null,
      status: null,
    });
  }

  private async loadHumanQuestionsInTransaction(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    input: {
      ids: string[] | null;
      sessionId: string | null;
      status: "open" | "resolved" | null;
    },
  ): Promise<AgentInboxHumanQuestionRecord[]> {
    const conditions: unknown[] = [
      eq(agentInboxItems.companyId, companyId),
      eq(agentInboxItems.kind, "human_question"),
    ];
    if (input.status) {
      conditions.push(eq(agentInboxItems.status, input.status));
    }
    if (input.sessionId) {
      conditions.push(eq(agentInboxItems.sessionId, input.sessionId));
    }
    if (input.ids && input.ids.length > 0) {
      conditions.push(inArray(agentInboxItems.id, input.ids));
    }

    const inboxItems = await selectableDatabase
      .select({
        agentId: agentInboxItems.agentId,
        companyId: agentInboxItems.companyId,
        createdAt: agentInboxItems.createdAt,
        id: agentInboxItems.id,
        kind: agentInboxItems.kind,
        resolvedAt: agentInboxItems.resolvedAt,
        resolvedByUserId: agentInboxItems.resolvedByUserId,
        sessionId: agentInboxItems.sessionId,
        status: agentInboxItems.status,
        summary: agentInboxItems.summary,
        title: agentInboxItems.title,
        toolCallId: agentInboxItems.toolCallId,
        updatedAt: agentInboxItems.updatedAt,
      })
      .from(agentInboxItems)
      .where(and(...conditions)) as InboxItemRow[];
    if (inboxItems.length === 0) {
      return [];
    }

    const itemIds = inboxItems.map((item) => item.id);
    const [questions, proposals, answers, agentRows, sessionRows] = await Promise.all([
      selectableDatabase
        .select({
          allowCustomAnswer: agentInboxHumanQuestions.allowCustomAnswer,
          createdAt: agentInboxHumanQuestions.createdAt,
          inboxItemId: agentInboxHumanQuestions.inboxItemId,
          questionText: agentInboxHumanQuestions.questionText,
        })
        .from(agentInboxHumanQuestions)
        .where(inArray(agentInboxHumanQuestions.inboxItemId, itemIds)) as Promise<HumanQuestionRow[]>,
      selectableDatabase
        .select({
          answerText: agentInboxHumanQuestionProposals.answerText,
          cons: agentInboxHumanQuestionProposals.cons,
          createdAt: agentInboxHumanQuestionProposals.createdAt,
          id: agentInboxHumanQuestionProposals.id,
          inboxItemId: agentInboxHumanQuestionProposals.inboxItemId,
          pros: agentInboxHumanQuestionProposals.pros,
          rating: agentInboxHumanQuestionProposals.rating,
          sortOrder: agentInboxHumanQuestionProposals.sortOrder,
        })
        .from(agentInboxHumanQuestionProposals)
        .where(inArray(agentInboxHumanQuestionProposals.inboxItemId, itemIds)) as Promise<AgentInboxHumanQuestionProposalRecord[]>,
      selectableDatabase
        .select({
          answeredByUserId: agentInboxHumanQuestionAnswers.answeredByUserId,
          createdAt: agentInboxHumanQuestionAnswers.createdAt,
          customAnswerText: agentInboxHumanQuestionAnswers.customAnswerText,
          finalAnswerText: agentInboxHumanQuestionAnswers.finalAnswerText,
          id: agentInboxHumanQuestionAnswers.id,
          inboxItemId: agentInboxHumanQuestionAnswers.inboxItemId,
          selectedProposalId: agentInboxHumanQuestionAnswers.selectedProposalId,
        })
        .from(agentInboxHumanQuestionAnswers)
        .where(inArray(agentInboxHumanQuestionAnswers.inboxItemId, itemIds)) as Promise<AnswerRow[]>,
      selectableDatabase
        .select({
          id: agents.id,
          name: agents.name,
        })
        .from(agents)
        .where(inArray(agents.id, [...new Set(inboxItems.map((item) => item.agentId))])) as Promise<AgentRow[]>,
      selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          id: agentSessions.id,
          inferredTitle: agentSessions.inferredTitle,
          status: agentSessions.status,
          userSetTitle: agentSessions.userSetTitle,
        })
        .from(agentSessions)
        .where(inArray(agentSessions.id, [...new Set(inboxItems.map((item) => item.sessionId))])) as Promise<SessionRow[]>,
    ]);

    const questionsByItemId = new Map(questions.map((question) => [question.inboxItemId, question]));
    const answersByItemId = new Map(answers.map((answer) => [answer.inboxItemId, answer]));
    const agentsById = new Map(agentRows.map((agent) => [agent.id, agent]));
    const sessionsById = new Map(sessionRows.map((session) => [session.id, session]));
    const proposalsByItemId = new Map<string, AgentInboxHumanQuestionProposalRecord[]>();
    for (const proposal of proposals) {
      const currentProposals = proposalsByItemId.get(proposal.inboxItemId) ?? [];
      currentProposals.push(proposal);
      proposalsByItemId.set(proposal.inboxItemId, currentProposals);
    }

    return [...inboxItems]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((item) => {
        const question = questionsByItemId.get(item.id);
        if (!question) {
          throw new Error(`Human question payload not found for inbox item ${item.id}.`);
        }

        const session = sessionsById.get(item.sessionId);
        const agent = agentsById.get(item.agentId);
        return {
          agentId: item.agentId,
          agentName: agent?.name ?? item.agentId,
          allowCustomAnswer: question.allowCustomAnswer,
          answer: answersByItemId.get(item.id) ?? null,
          companyId: item.companyId,
          createdAt: item.createdAt,
          id: item.id,
          kind: item.kind,
          proposals: [...(proposalsByItemId.get(item.id) ?? [])].sort((left, right) => {
            if (left.rating !== right.rating) {
              return right.rating - left.rating;
            }

            return left.sortOrder - right.sortOrder;
          }),
          questionText: question.questionText,
          resolvedAt: item.resolvedAt,
          resolvedByUserId: item.resolvedByUserId,
          sessionId: item.sessionId,
          sessionTitle: this.resolveSessionTitle(session),
          status: item.status,
          summary: item.summary,
          title: item.title,
          toolCallId: item.toolCallId,
          updatedAt: item.updatedAt,
        };
      });
  }

  private async publishSessionHumanQuestionsUpdated(
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(
      this.sessionProcessPubSubNames.getSessionInboxHumanQuestionsUpdateChannel(sessionId),
    );
  }

  private validateCreateInput(input: {
    allowCustomAnswer?: boolean;
    proposals: Array<{
      answerText: string;
      cons?: string[];
      pros?: string[];
      rating: number;
    }>;
    questionText: string;
  }): void {
    if (input.questionText.trim().length === 0) {
      throw new Error("questionText is required.");
    }
    if (input.proposals.length > 4) {
      throw new Error("A maximum of 4 proposals is allowed.");
    }
    if ((input.allowCustomAnswer ?? true) === false && input.proposals.length === 0) {
      throw new Error("Questions without custom answers require at least one proposal.");
    }
    for (const proposal of input.proposals) {
      if (proposal.answerText.trim().length === 0) {
        throw new Error("Proposal answerText is required.");
      }
      if (!Number.isInteger(proposal.rating)) {
        throw new Error("Proposal rating must be an integer.");
      }
      if (proposal.rating < 1 || proposal.rating > 5) {
        throw new Error("Proposal rating must be between 1 and 5.");
      }
    }
  }

  private resolveTitle(title: string | null | undefined, questionText: string): string {
    if (typeof title === "string" && title.trim().length > 0) {
      return title;
    }

    return questionText.trim().slice(0, 80);
  }

  private resolveSummary(questionText: string): string {
    return questionText.trim().slice(0, 160);
  }

  private resolveSessionTitle(session: SessionRow | undefined): string {
    if (!session) {
      return "Unknown chat";
    }

    const preferredTitle = session.userSetTitle ?? session.inferredTitle ?? "";
    if (preferredTitle.trim().length > 0) {
      return preferredTitle;
    }

    return "Untitled chat";
  }

  private formatSteerMessage(title: string, finalAnswerText: string): string {
    return `Human answered your question "${title}": ${finalAnswerText}`;
  }
}
