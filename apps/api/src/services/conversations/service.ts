import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, lt, ne, or } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { type AppRuntimeTransaction, type TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import {
  agentConversationMessages,
  agentConversationParticipants,
  agentConversations,
  agentSessions,
  agents,
} from "../../db/schema.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { AgentConversationMessageTemplate } from "../../prompts/agent_conversation_message_template.ts";
import { SessionManagerService } from "../agent/session/session_manager_service.ts";

export type AgentConversationSendMessageInput = {
  companyId: string;
  sourceAgentId: string;
  sourceSessionId: string;
  targetAgentId?: string | null;
  targetSessionId?: string | null;
  text: string;
};

export type AgentConversationSendMessageResult = {
  conversationId: string;
  createdNewTargetSession: boolean;
  messageId: string;
  targetAgentId: string;
  targetSessionId: string;
};

export type AgentConversationParticipantRecord = {
  agentId: string;
  agentName: string;
  id: string;
  sessionId: string;
  sessionTitle: string;
};

export type AgentConversationRecord = {
  createdAt: Date;
  id: string;
  latestMessageAt: Date | null;
  latestMessagePreview: string | null;
  participants: AgentConversationParticipantRecord[];
  updatedAt: Date;
};

export type AgentConversationMessageRecord = {
  authorAgentId: string;
  authorAgentName: string;
  authorParticipantId: string;
  authorSessionId: string;
  authorSessionTitle: string;
  conversationId: string;
  createdAt: Date;
  id: string;
  text: string;
};

type PageInfoRecord = {
  endCursor: string | null;
  hasNextPage: boolean;
};

type AgentConversationMessageEdgeRecord = {
  cursor: string;
  node: AgentConversationMessageRecord;
};

export type AgentConversationMessageConnectionRecord = {
  edges: AgentConversationMessageEdgeRecord[];
  pageInfo: PageInfoRecord;
};

type AgentRow = {
  id: string;
  name: string;
};

type AgentConversationParticipantRow = {
  agentId: string;
  conversationId: string;
  id: string;
  sessionId: string;
};

type AgentConversationRow = {
  createdAt: Date;
  id: string;
  updatedAt: Date;
};

type AgentConversationMessageRow = {
  authorParticipantId: string;
  conversationId: string;
  createdAt: Date;
  id: string;
  text: string;
};

type SessionRow = {
  agentId: string;
  id: string;
  inferredTitle?: string | null;
  status: string;
  userSetTitle?: string | null;
};

type PlannedDelivery = {
  createdNewTargetSession: boolean;
  shouldSteerDelivery: boolean;
  targetAgentId: string;
  targetSessionId: string;
};

const DEFAULT_AGENT_CONVERSATION_PAGE_SIZE = 50;
const MAX_AGENT_CONVERSATION_PAGE_SIZE = 200;
const AGENT_CONVERSATION_MESSAGE_CURSOR_PREFIX = "agent-conversation-message:";

function normalizeConversationMessagePageSize(first?: number | null): number {
  if (!Number.isInteger(first) || Number(first) <= 0) {
    return DEFAULT_AGENT_CONVERSATION_PAGE_SIZE;
  }

  return Math.min(Number(first), MAX_AGENT_CONVERSATION_PAGE_SIZE);
}

function encodeConversationMessageCursor(createdAt: string, messageId: string): string {
  return Buffer.from(
    `${AGENT_CONVERSATION_MESSAGE_CURSOR_PREFIX}${createdAt}|${messageId}`,
    "utf8",
  ).toString("base64url");
}

function decodeConversationMessageCursor(cursor?: string | null): { createdAt: string; messageId: string } | null {
  if (!cursor) {
    return null;
  }

  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  if (!decoded.startsWith(AGENT_CONVERSATION_MESSAGE_CURSOR_PREFIX)) {
    throw new Error("Invalid cursor.");
  }

  const [createdAt = "", messageId = ""] = decoded.slice(AGENT_CONVERSATION_MESSAGE_CURSOR_PREFIX.length).split("|");
  if (!createdAt || !messageId) {
    throw new Error("Invalid cursor.");
  }

  return { createdAt, messageId };
}

/**
 * Coordinates agent-to-agent messaging by binding one canonical conversation record to two agent
 * sessions and queueing the rendered delivery text into the target session. The canonical records
 * stay internal for now so the only public runtime surface can remain the send_agent_message tool.
 */
@injectable()
export class AgentConversationService {
  private readonly deliveryPrompt: AgentConversationMessageTemplate;
  private readonly logger: PinoLogger;
  private readonly sessionManagerService: SessionManagerService;

  constructor(
    @inject(ApiLogger) logger: ApiLogger,
    @inject(SessionManagerService) sessionManagerService: SessionManagerService,
  ) {
    this.deliveryPrompt = new AgentConversationMessageTemplate();
    this.logger = logger.child({
      component: "agent_conversation_service",
    });
    this.sessionManagerService = sessionManagerService;
  }

  async sendMessage(
    transactionProvider: TransactionProviderInterface,
    input: AgentConversationSendMessageInput,
  ): Promise<AgentConversationSendMessageResult> {
    this.validateInput(input);

    const persistedMessage = await transactionProvider.transaction(async (tx) => {
      const sourceSession = await this.loadSession(tx, input.companyId, input.sourceSessionId);
      if (sourceSession.agentId !== input.sourceAgentId) {
        throw new Error("Source session does not belong to the current agent.");
      }
      if (sourceSession.status === "archived") {
        throw new Error("Archived sessions cannot send agent messages.");
      }

      const sourceAgent = await this.loadAgent(tx, input.companyId, input.sourceAgentId);
      const delivery = await this.planDelivery(tx, input, sourceAgent);
      const persistedConversation = await this.resolveOrCreateConversation(
        tx,
        input.companyId,
        input.sourceAgentId,
        input.sourceSessionId,
        delivery.targetAgentId,
        delivery.targetSessionId,
      );
      const createdAt = new Date();
      const messageId = randomUUID();
      await tx.insert(agentConversationMessages).values({
        authorParticipantId: persistedConversation.sourceParticipantId,
        companyId: input.companyId,
        conversationId: persistedConversation.conversationId,
        createdAt,
        id: messageId,
        text: input.text,
      });
      await tx
        .update(agentConversations)
        .set({
          updatedAt: createdAt,
        })
        .where(and(
          eq(agentConversations.companyId, input.companyId),
          eq(agentConversations.id, persistedConversation.conversationId),
        ));

      return {
        conversationId: persistedConversation.conversationId,
        createdNewTargetSession: delivery.createdNewTargetSession,
        messageId,
        shouldSteerDelivery: delivery.shouldSteerDelivery,
        targetAgentId: delivery.targetAgentId,
        targetSessionId: delivery.targetSessionId,
      };
    });

    await this.sessionManagerService.notifyQueuedSessionMessage(
      input.companyId,
      persistedMessage.targetSessionId,
      persistedMessage.shouldSteerDelivery,
    );

    this.logger.info({
      companyId: input.companyId,
      conversationId: persistedMessage.conversationId,
      messageId: persistedMessage.messageId,
      sourceAgentId: input.sourceAgentId,
      sourceSessionId: input.sourceSessionId,
      targetAgentId: persistedMessage.targetAgentId,
      targetSessionId: persistedMessage.targetSessionId,
    }, "sent agent conversation message");

    return {
      conversationId: persistedMessage.conversationId,
      createdNewTargetSession: persistedMessage.createdNewTargetSession,
      messageId: persistedMessage.messageId,
      targetAgentId: persistedMessage.targetAgentId,
      targetSessionId: persistedMessage.targetSessionId,
    };
  }

  async listConversations(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<AgentConversationRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const conversationRows = await tx
        .select({
          createdAt: agentConversations.createdAt,
          id: agentConversations.id,
          updatedAt: agentConversations.updatedAt,
        })
        .from(agentConversations)
        .where(eq(agentConversations.companyId, companyId)) as AgentConversationRow[];
      if (conversationRows.length === 0) {
        return [];
      }

      const conversationIds = conversationRows.map((conversationRow) => conversationRow.id);
      const participantRows = await tx
        .select({
          agentId: agentConversationParticipants.agentId,
          conversationId: agentConversationParticipants.conversationId,
          id: agentConversationParticipants.id,
          sessionId: agentConversationParticipants.sessionId,
        })
        .from(agentConversationParticipants)
        .where(and(
          eq(agentConversationParticipants.companyId, companyId),
          inArray(agentConversationParticipants.conversationId, conversationIds),
        )) as AgentConversationParticipantRow[];
      const messageRows = await tx
        .select({
          authorParticipantId: agentConversationMessages.authorParticipantId,
          conversationId: agentConversationMessages.conversationId,
          createdAt: agentConversationMessages.createdAt,
          id: agentConversationMessages.id,
          text: agentConversationMessages.text,
        })
        .from(agentConversationMessages)
        .where(and(
          eq(agentConversationMessages.companyId, companyId),
          inArray(agentConversationMessages.conversationId, conversationIds),
        )) as AgentConversationMessageRow[];
      const participantDetails = await this.loadParticipantDetails(tx, companyId, participantRows);
      const latestMessageByConversationId = this.buildLatestMessageByConversationId(messageRows);

      const conversations = conversationRows.map((conversationRow) => ({
        createdAt: conversationRow.createdAt,
        id: conversationRow.id,
        latestMessageAt: latestMessageByConversationId.get(conversationRow.id)?.createdAt ?? null,
        latestMessagePreview: latestMessageByConversationId.get(conversationRow.id)?.text ?? null,
        participants: participantRows
          .filter((participantRow) => participantRow.conversationId === conversationRow.id)
          .map((participantRow) => participantDetails.get(participantRow.id))
          .filter((participant): participant is AgentConversationParticipantRecord => participant !== undefined),
        updatedAt: conversationRow.updatedAt,
      }));
      conversations.sort((left, right) => {
        const leftTimestamp = left.latestMessageAt?.getTime() ?? left.updatedAt.getTime();
        const rightTimestamp = right.latestMessageAt?.getTime() ?? right.updatedAt.getTime();
        return rightTimestamp - leftTimestamp;
      });
      return conversations;
    });
  }

  async listMessages(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    conversationId?: string | null,
    first?: number | null,
    after?: string | null,
  ): Promise<AgentConversationMessageConnectionRecord> {
    if (!conversationId) {
      return {
        edges: [],
        pageInfo: {
          endCursor: null,
          hasNextPage: false,
        },
      };
    }

    return transactionProvider.transaction(async (tx) => {
      const pageSize = normalizeConversationMessagePageSize(first);
      const cursor = decodeConversationMessageCursor(after);
      const [conversationRow] = await tx
        .select({
          createdAt: agentConversations.createdAt,
          id: agentConversations.id,
          updatedAt: agentConversations.updatedAt,
        })
        .from(agentConversations)
        .where(and(
          eq(agentConversations.companyId, companyId),
          eq(agentConversations.id, conversationId),
        )) as AgentConversationRow[];
      if (!conversationRow) {
        throw new Error("Conversation not found.");
      }

      const participantRows = await tx
        .select({
          agentId: agentConversationParticipants.agentId,
          conversationId: agentConversationParticipants.conversationId,
          id: agentConversationParticipants.id,
          sessionId: agentConversationParticipants.sessionId,
        })
        .from(agentConversationParticipants)
        .where(and(
          eq(agentConversationParticipants.companyId, companyId),
          eq(agentConversationParticipants.conversationId, conversationId),
        )) as AgentConversationParticipantRow[];
      const participantDetails = await this.loadParticipantDetails(tx, companyId, participantRows);
      const messageRows = await tx
        .select({
          authorParticipantId: agentConversationMessages.authorParticipantId,
          conversationId: agentConversationMessages.conversationId,
          createdAt: agentConversationMessages.createdAt,
          id: agentConversationMessages.id,
          text: agentConversationMessages.text,
        })
        .from(agentConversationMessages)
        .where(cursor
          ? and(
            eq(agentConversationMessages.companyId, companyId),
            eq(agentConversationMessages.conversationId, conversationId),
            or(
              lt(agentConversationMessages.createdAt, new Date(cursor.createdAt)),
              and(
                eq(agentConversationMessages.createdAt, new Date(cursor.createdAt)),
                lt(agentConversationMessages.id, cursor.messageId),
              ),
            )!,
          )
          : and(
            eq(agentConversationMessages.companyId, companyId),
            eq(agentConversationMessages.conversationId, conversationId),
          ))
        .orderBy(desc(agentConversationMessages.createdAt), desc(agentConversationMessages.id))
        .limit(pageSize + 1) as AgentConversationMessageRow[];

      const hasNextPage = messageRows.length > pageSize;
      const pageRows = hasNextPage ? messageRows.slice(0, pageSize) : messageRows;
      const edges = pageRows.map((messageRow) => {
        const authorParticipant = participantDetails.get(messageRow.authorParticipantId);
        if (!authorParticipant) {
          throw new Error("Conversation participant not found.");
        }

        const node = {
          authorAgentId: authorParticipant.agentId,
          authorAgentName: authorParticipant.agentName,
          authorParticipantId: messageRow.authorParticipantId,
          authorSessionId: authorParticipant.sessionId,
          authorSessionTitle: authorParticipant.sessionTitle,
          conversationId: messageRow.conversationId,
          createdAt: messageRow.createdAt,
          id: messageRow.id,
          text: messageRow.text,
        };

        return {
          cursor: encodeConversationMessageCursor(node.createdAt.toISOString(), node.id),
          node,
        };
      });

      return {
        edges,
        pageInfo: {
          endCursor: edges.at(-1)?.cursor ?? null,
          hasNextPage,
        },
      };
    });
  }

  private validateInput(input: AgentConversationSendMessageInput): void {
    if (!/\S/.test(input.text)) {
      throw new Error("text is required.");
    }

    const targetCount = [input.targetAgentId, input.targetSessionId]
      .filter((value) => String(value ?? "").trim().length > 0)
      .length;
    if (targetCount !== 1) {
      throw new Error("Exactly one of targetAgentId or targetSessionId is required.");
    }
  }

  private async planDelivery(
    tx: AppRuntimeTransaction,
    input: AgentConversationSendMessageInput,
    sourceAgent: AgentRow,
  ): Promise<PlannedDelivery> {
    const deliveryText = this.deliveryPrompt.render({
      sourceAgentId: input.sourceAgentId,
      sourceAgentName: sourceAgent.name,
      sourceSessionId: input.sourceSessionId,
      text: input.text,
    });

    if (input.targetSessionId) {
      if (input.targetSessionId === input.sourceSessionId) {
        throw new Error("Cannot send an agent message to the same session.");
      }

      const targetSession = await this.loadSession(tx, input.companyId, input.targetSessionId);
      if (targetSession.status === "archived") {
        throw new Error("Archived sessions cannot receive agent messages.");
      }

      await this.sessionManagerService.queuePromptInTransaction(
        tx,
        tx,
        tx,
        input.companyId,
        targetSession.id,
        deliveryText,
        {
          shouldSteer: true,
        },
      );

      return {
        createdNewTargetSession: false,
        shouldSteerDelivery: true,
        targetAgentId: targetSession.agentId,
        targetSessionId: targetSession.id,
      };
    }

    const targetAgentId = input.targetAgentId as string;
    if (targetAgentId === input.sourceAgentId) {
      throw new Error("Cannot send an agent message to the same agent without an explicit target session.");
    }

    await this.loadAgent(tx, input.companyId, targetAgentId);
    const reusableTarget = await this.findReusableTargetSession(
      tx,
      input.companyId,
      input.sourceSessionId,
      targetAgentId,
    );
    if (reusableTarget) {
      await this.sessionManagerService.queuePromptInTransaction(
        tx,
        tx,
        tx,
        input.companyId,
        reusableTarget.targetSessionId,
        deliveryText,
        {
          shouldSteer: true,
        },
      );

      return {
        createdNewTargetSession: false,
        shouldSteerDelivery: true,
        targetAgentId,
        targetSessionId: reusableTarget.targetSessionId,
      };
    }

    const createdSession = await this.sessionManagerService.createSessionInTransaction(
      tx,
      tx,
      input.companyId,
      targetAgentId,
      deliveryText,
    );

    return {
      createdNewTargetSession: true,
      shouldSteerDelivery: false,
      targetAgentId,
      targetSessionId: createdSession.id,
    };
  }

  private async resolveOrCreateConversation(
    tx: AppRuntimeTransaction,
    companyId: string,
    sourceAgentId: string,
    sourceSessionId: string,
    targetAgentId: string,
    targetSessionId: string,
  ): Promise<{ conversationId: string; sourceParticipantId: string }> {
    const existingConversation = await this.findConversationBySessions(
      tx,
      companyId,
      sourceSessionId,
      targetSessionId,
    );
    if (existingConversation) {
      return existingConversation;
    }

    const conversationId = randomUUID();
    const sourceParticipantId = randomUUID();
    const createdAt = new Date();
    await tx.insert(agentConversations).values({
      companyId,
      createdAt,
      id: conversationId,
      updatedAt: createdAt,
    });
    await tx.insert(agentConversationParticipants).values([
      {
        agentId: sourceAgentId,
        companyId,
        conversationId,
        createdAt,
        id: sourceParticipantId,
        sessionId: sourceSessionId,
      },
      {
        agentId: targetAgentId,
        companyId,
        conversationId,
        createdAt,
        id: randomUUID(),
        sessionId: targetSessionId,
      },
    ]);

    return {
      conversationId,
      sourceParticipantId,
    };
  }

  private async findConversationBySessions(
    tx: AppRuntimeTransaction,
    companyId: string,
    sourceSessionId: string,
    targetSessionId: string,
  ): Promise<{ conversationId: string; sourceParticipantId: string } | null> {
    const participantRows = await tx
      .select({
        agentId: agentConversationParticipants.agentId,
        conversationId: agentConversationParticipants.conversationId,
        id: agentConversationParticipants.id,
        sessionId: agentConversationParticipants.sessionId,
      })
      .from(agentConversationParticipants)
      .where(and(
        eq(agentConversationParticipants.companyId, companyId),
        inArray(agentConversationParticipants.sessionId, [sourceSessionId, targetSessionId]),
      )) as AgentConversationParticipantRow[];
    const conversationIds = [...new Set(
      participantRows
        .filter((participantRow) => participantRow.sessionId === sourceSessionId)
        .map((participantRow) => participantRow.conversationId),
    )];
    if (conversationIds.length === 0) {
      return null;
    }

    const candidateParticipantRows = participantRows.filter((participantRow) => {
      return conversationIds.includes(participantRow.conversationId);
    });
    const candidateConversationIds = [...new Set(
      candidateParticipantRows
        .filter((participantRow) => participantRow.sessionId === targetSessionId)
        .map((participantRow) => participantRow.conversationId),
    )];
    if (candidateConversationIds.length === 0) {
      return null;
    }

    const selectedConversation = await this.selectLatestConversation(tx, companyId, candidateConversationIds);
    if (!selectedConversation) {
      return null;
    }

    const sourceParticipant = candidateParticipantRows.find((participantRow) => {
      return participantRow.conversationId === selectedConversation.id && participantRow.sessionId === sourceSessionId;
    });
    if (!sourceParticipant) {
      return null;
    }

    return {
      conversationId: selectedConversation.id,
      sourceParticipantId: sourceParticipant.id,
    };
  }

  private async findReusableTargetSession(
    tx: AppRuntimeTransaction,
    companyId: string,
    sourceSessionId: string,
    targetAgentId: string,
  ): Promise<{ targetSessionId: string } | null> {
    const sourceParticipantRows = await tx
      .select({
        agentId: agentConversationParticipants.agentId,
        conversationId: agentConversationParticipants.conversationId,
        id: agentConversationParticipants.id,
        sessionId: agentConversationParticipants.sessionId,
      })
      .from(agentConversationParticipants)
      .where(and(
        eq(agentConversationParticipants.companyId, companyId),
        eq(agentConversationParticipants.sessionId, sourceSessionId),
      )) as AgentConversationParticipantRow[];
    if (sourceParticipantRows.length === 0) {
      return null;
    }

    const candidateConversationIds = sourceParticipantRows.map((participantRow) => participantRow.conversationId);
    const targetParticipantRows = await tx
      .select({
        agentId: agentConversationParticipants.agentId,
        conversationId: agentConversationParticipants.conversationId,
        id: agentConversationParticipants.id,
        sessionId: agentConversationParticipants.sessionId,
      })
      .from(agentConversationParticipants)
      .where(and(
        eq(agentConversationParticipants.companyId, companyId),
        inArray(agentConversationParticipants.conversationId, candidateConversationIds),
        eq(agentConversationParticipants.agentId, targetAgentId),
        ne(agentConversationParticipants.sessionId, sourceSessionId),
      )) as AgentConversationParticipantRow[];
    if (targetParticipantRows.length === 0) {
      return null;
    }

    const targetSessionRows = await tx
      .select({
        agentId: agentSessions.agentId,
        id: agentSessions.id,
        status: agentSessions.status,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        inArray(agentSessions.id, targetParticipantRows.map((participantRow) => participantRow.sessionId)),
      )) as SessionRow[];
    const activeTargetParticipants = targetParticipantRows.filter((participantRow) => {
      return targetSessionRows.some((sessionRow) => {
        return sessionRow.id === participantRow.sessionId && sessionRow.status !== "archived";
      });
    });
    if (activeTargetParticipants.length !== 1) {
      return null;
    }

    return {
      targetSessionId: activeTargetParticipants[0]?.sessionId as string,
    };
  }

  private async selectLatestConversation(
    tx: AppRuntimeTransaction,
    companyId: string,
    conversationIds: string[],
  ): Promise<AgentConversationRow | null> {
    const conversationRows = await tx
      .select({
        id: agentConversations.id,
        updatedAt: agentConversations.updatedAt,
      })
      .from(agentConversations)
      .where(and(
        eq(agentConversations.companyId, companyId),
        inArray(agentConversations.id, conversationIds),
      )) as AgentConversationRow[];
    if (conversationRows.length === 0) {
      return null;
    }

    conversationRows.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
    return conversationRows[0] ?? null;
  }

  private buildLatestMessageByConversationId(
    messageRows: AgentConversationMessageRow[],
  ): Map<string, AgentConversationMessageRow> {
    const latestMessageByConversationId = new Map<string, AgentConversationMessageRow>();
    for (const messageRow of messageRows) {
      const currentLatest = latestMessageByConversationId.get(messageRow.conversationId);
      if (!currentLatest || currentLatest.createdAt.getTime() < messageRow.createdAt.getTime()) {
        latestMessageByConversationId.set(messageRow.conversationId, messageRow);
      }
    }

    return latestMessageByConversationId;
  }

  private async loadParticipantDetails(
    tx: AppRuntimeTransaction,
    companyId: string,
    participantRows: AgentConversationParticipantRow[],
  ): Promise<Map<string, AgentConversationParticipantRecord>> {
    if (participantRows.length === 0) {
      return new Map();
    }

    const agentRows = await tx
      .select({
        id: agents.id,
        name: agents.name,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        inArray(agents.id, [...new Set(participantRows.map((participantRow) => participantRow.agentId))]),
      )) as AgentRow[];
    const sessionRows = await tx
      .select({
        agentId: agentSessions.agentId,
        id: agentSessions.id,
        inferredTitle: agentSessions.inferredTitle,
        status: agentSessions.status,
        userSetTitle: agentSessions.userSetTitle,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        inArray(agentSessions.id, [...new Set(participantRows.map((participantRow) => participantRow.sessionId))]),
      )) as SessionRow[];

    const agentNameById = new Map(agentRows.map((agentRow) => [agentRow.id, agentRow.name]));
    const sessionById = new Map(sessionRows.map((sessionRow) => [sessionRow.id, sessionRow]));

    return new Map(participantRows.map((participantRow) => {
      return [participantRow.id, {
        agentId: participantRow.agentId,
        agentName: agentNameById.get(participantRow.agentId) ?? "Unknown agent",
        id: participantRow.id,
        sessionId: participantRow.sessionId,
        sessionTitle: this.resolveSessionTitle(sessionById.get(participantRow.sessionId)),
      }];
    }));
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

  private async loadAgent(
    tx: AppRuntimeTransaction,
    companyId: string,
    agentId: string,
  ): Promise<AgentRow> {
    const [agentRow] = await tx
      .select({
        id: agents.id,
        name: agents.name,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.id, agentId),
      )) as AgentRow[];
    if (!agentRow) {
      throw new Error("Agent not found.");
    }

    return agentRow;
  }

  private async loadSession(
    tx: AppRuntimeTransaction,
    companyId: string,
    sessionId: string,
  ): Promise<SessionRow> {
    const [sessionRow] = await tx
      .select({
        agentId: agentSessions.agentId,
        id: agentSessions.id,
        status: agentSessions.status,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        eq(agentSessions.id, sessionId),
      )) as SessionRow[];
    if (!sessionRow) {
      throw new Error("Session not found.");
    }

    return sessionRow;
  }
}
