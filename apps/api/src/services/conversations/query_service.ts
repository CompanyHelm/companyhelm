import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { type AppRuntimeTransaction, type TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import {
  agentConversationMessages,
  agentConversationParticipants,
  agentConversations,
  agentSessions,
  agents,
} from "../../db/schema.ts";
import type {
  AgentConversationMessageConnectionRecord,
  AgentConversationParticipantRecord,
  AgentConversationRecord,
} from "./service.ts";

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

type ConversationMessageCursor = {
  createdAt: string;
  messageId: string;
};

/**
 * Owns read-side conversation queries so participant hydration, preview assembly, message
 * pagination, and ordering stay grouped away from the write-side routing logic.
 */
export class AgentConversationQueryService {
  private readonly defaultPageSize = 50;
  private readonly maxPageSize = 200;
  private readonly messageCursorPrefix = "agent-conversation-message:";

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
      const pageSize = this.normalizeConversationMessagePageSize(first);
      const cursor = this.decodeConversationMessageCursor(after);
      await this.loadConversation(tx, companyId, conversationId);

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
          cursor: this.encodeConversationMessageCursor(node.createdAt.toISOString(), node.id),
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

  private decodeConversationMessageCursor(cursor?: string | null): ConversationMessageCursor | null {
    if (!cursor) {
      return null;
    }

    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    if (!decoded.startsWith(this.messageCursorPrefix)) {
      throw new Error("Invalid cursor.");
    }

    const [createdAt = "", messageId = ""] = decoded.slice(this.messageCursorPrefix.length).split("|");
    if (!createdAt || !messageId) {
      throw new Error("Invalid cursor.");
    }

    return {
      createdAt,
      messageId,
    };
  }

  private encodeConversationMessageCursor(createdAt: string, messageId: string): string {
    return Buffer.from(
      `${this.messageCursorPrefix}${createdAt}|${messageId}`,
      "utf8",
    ).toString("base64url");
  }

  private async loadConversation(
    tx: AppRuntimeTransaction,
    companyId: string,
    conversationId: string,
  ): Promise<AgentConversationRow> {
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

    return conversationRow;
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

  private normalizeConversationMessagePageSize(first?: number | null): number {
    if (!Number.isInteger(first) || Number(first) <= 0) {
      return this.defaultPageSize;
    }

    return Math.min(Number(first), this.maxPageSize);
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
}
