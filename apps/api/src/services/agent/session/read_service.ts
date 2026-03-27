import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { injectable } from "inversify";
import { agentSessions, messageContents, sessionMessages } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";

type SessionRow = {
  id: string;
  agentId: string;
  currentModelId: string;
  currentReasoningLevel: string;
  inferredTitle: string | null;
  isThinking: boolean;
  status: string;
  thinkingText: string | null;
  createdAt: Date;
  updatedAt: Date;
  userSetTitle: string | null;
};

type SessionMessageRow = {
  id: string;
  sessionId: string;
  role: string;
  status: string;
  isError: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MessageContentRow = {
  messageId: string;
  text: string | null;
  type: string;
  createdAt: Date;
};

const DEFAULT_SESSION_TRANSCRIPT_PAGE_SIZE = 50;
const MAX_SESSION_TRANSCRIPT_PAGE_SIZE = 200;
const SESSION_MESSAGE_CURSOR_PREFIX = "session-message:";

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        orderBy(...values: unknown[]): {
          limit(limit: number): Promise<Array<Record<string, unknown>>>;
        };
      } & Promise<Array<Record<string, unknown>>>;
    };
  };
};

export type SessionGraphqlRecord = {
  id: string;
  agentId: string;
  modelId: string;
  reasoningLevel: string;
  inferredTitle: string | null;
  isThinking: boolean;
  status: string;
  thinkingText: string | null;
  createdAt: string;
  updatedAt: string;
  userSetTitle: string | null;
};

export type SessionMessageGraphqlRecord = {
  id: string;
  sessionId: string;
  role: string;
  status: string;
  text: string;
  isError: boolean;
  createdAt: string;
  updatedAt: string;
};

type PageInfoGraphqlRecord = {
  hasNextPage: boolean;
  endCursor: string | null;
};

type SessionTranscriptMessageEdgeGraphqlRecord = {
  cursor: string;
  node: SessionMessageGraphqlRecord;
};

export type SessionTranscriptMessageConnectionGraphqlRecord = {
  edges: SessionTranscriptMessageEdgeGraphqlRecord[];
  pageInfo: PageInfoGraphqlRecord;
};

function normalizeTranscriptPageSize(first?: number | null): number {
  if (!Number.isInteger(first) || Number(first) <= 0) {
    return DEFAULT_SESSION_TRANSCRIPT_PAGE_SIZE;
  }

  return Math.min(Number(first), MAX_SESSION_TRANSCRIPT_PAGE_SIZE);
}

function encodeSessionMessageCursor(createdAt: string, messageId: string): string {
  return Buffer.from(`${SESSION_MESSAGE_CURSOR_PREFIX}${createdAt}|${messageId}`, "utf8").toString("base64url");
}

function decodeSessionMessageCursor(cursor?: string | null): { createdAt: string; messageId: string } | null {
  if (!cursor) {
    return null;
  }

  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  if (!decoded.startsWith(SESSION_MESSAGE_CURSOR_PREFIX)) {
    throw new Error("Invalid cursor.");
  }

  const [createdAt = "", messageId = ""] = decoded.slice(SESSION_MESSAGE_CURSOR_PREFIX.length).split("|");
  if (!createdAt || !messageId) {
    throw new Error("Invalid cursor.");
  }

  return { createdAt, messageId };
}

/**
 * Loads session and transcript records from Postgres in the GraphQL shape expected by the web app.
 * Redis notifications only indicate that something changed; this service remains the source for
 * full session and message payloads so subscriptions always publish database state.
 */
@injectable()
export class SessionReadService {
  async listSessions(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<SessionGraphqlRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const sessionRows = await selectableDatabase
        .select({
          id: agentSessions.id,
          agentId: agentSessions.agentId,
          currentModelId: agentSessions.currentModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          inferredTitle: agentSessions.inferredTitle,
          isThinking: agentSessions.isThinking,
          status: agentSessions.status,
          thinkingText: agentSessions.thinkingText,
          createdAt: agentSessions.created_at,
          updatedAt: agentSessions.updated_at,
          userSetTitle: agentSessions.userSetTitle,
        })
        .from(agentSessions)
        .where(eq(agentSessions.companyId, companyId)) as SessionRow[];

      return [...sessionRows]
        .sort((leftSession, rightSession) => rightSession.updatedAt.getTime() - leftSession.updatedAt.getTime())
        .map((sessionRow) => this.serializeSession(sessionRow));
    });
  }

  async getSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<SessionGraphqlRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const sessionRows = await selectableDatabase
        .select({
          id: agentSessions.id,
          agentId: agentSessions.agentId,
          currentModelId: agentSessions.currentModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          inferredTitle: agentSessions.inferredTitle,
          isThinking: agentSessions.isThinking,
          status: agentSessions.status,
          thinkingText: agentSessions.thinkingText,
          createdAt: agentSessions.created_at,
          updatedAt: agentSessions.updated_at,
          userSetTitle: agentSessions.userSetTitle,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        )) as SessionRow[];

      const sessionRow = sessionRows[0];
      return sessionRow ? this.serializeSession(sessionRow) : null;
    });
  }

  async listMessages(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<SessionMessageGraphqlRecord[]> {
    return this.listMessagesForFilter(transactionProvider, companyId);
  }

  async listTranscriptMessages(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    first?: number | null,
    after?: string | null,
  ): Promise<SessionTranscriptMessageConnectionGraphqlRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const pageSize = normalizeTranscriptPageSize(first);
      const cursor = decodeSessionMessageCursor(after);
      const transcriptFilter = cursor
        ? and(
          eq(sessionMessages.companyId, companyId),
          eq(sessionMessages.sessionId, sessionId),
          or(
            lt(sessionMessages.createdAt, new Date(cursor.createdAt)),
            and(
              eq(sessionMessages.createdAt, new Date(cursor.createdAt)),
              lt(sessionMessages.id, cursor.messageId),
            ),
          )!,
        )
        : and(
          eq(sessionMessages.companyId, companyId),
          eq(sessionMessages.sessionId, sessionId),
        );

      const persistedMessages = await selectableDatabase
        .select({
          id: sessionMessages.id,
          sessionId: sessionMessages.sessionId,
          role: sessionMessages.role,
          status: sessionMessages.status,
          isError: sessionMessages.isError,
          createdAt: sessionMessages.createdAt,
          updatedAt: sessionMessages.updatedAt,
        })
        .from(sessionMessages)
        .where(transcriptFilter)
        .orderBy(desc(sessionMessages.createdAt), desc(sessionMessages.id))
        .limit(pageSize + 1) as SessionMessageRow[];

      const hasNextPage = persistedMessages.length > pageSize;
      const pageMessages = hasNextPage ? persistedMessages.slice(0, pageSize) : persistedMessages;
      if (pageMessages.length === 0) {
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        };
      }

      const textsByMessageId = await this.loadTextsByMessageId(
        selectableDatabase,
        companyId,
        pageMessages.map((message) => message.id),
      );

      const edges = pageMessages.map((message) => {
        const node = this.serializeMessage(message, textsByMessageId);
        return {
          cursor: encodeSessionMessageCursor(node.createdAt, node.id),
          node,
        };
      });

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.at(-1)?.cursor ?? null,
        },
      };
    });
  }

  async getMessage(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    messageId: string,
  ): Promise<SessionMessageGraphqlRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const persistedMessages = await selectableDatabase
        .select({
          id: sessionMessages.id,
          sessionId: sessionMessages.sessionId,
          role: sessionMessages.role,
          status: sessionMessages.status,
          isError: sessionMessages.isError,
          createdAt: sessionMessages.createdAt,
          updatedAt: sessionMessages.updatedAt,
        })
        .from(sessionMessages)
        .where(and(
          eq(sessionMessages.companyId, companyId),
          eq(sessionMessages.id, messageId),
        )) as SessionMessageRow[];

      const persistedMessage = persistedMessages[0];
      if (!persistedMessage) {
        return null;
      }

      const textsByMessageId = await this.loadTextsByMessageId(selectableDatabase, companyId, [persistedMessage.id]);
      return this.serializeMessage(persistedMessage, textsByMessageId);
    });
  }

  private async listMessagesForFilter(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId?: string,
  ): Promise<SessionMessageGraphqlRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const persistedMessages = await selectableDatabase
        .select({
          id: sessionMessages.id,
          sessionId: sessionMessages.sessionId,
          role: sessionMessages.role,
          status: sessionMessages.status,
          isError: sessionMessages.isError,
          createdAt: sessionMessages.createdAt,
          updatedAt: sessionMessages.updatedAt,
        })
        .from(sessionMessages)
        .where(sessionId
          ? and(
            eq(sessionMessages.companyId, companyId),
            eq(sessionMessages.sessionId, sessionId),
          )
          : eq(sessionMessages.companyId, companyId)) as SessionMessageRow[];

      if (persistedMessages.length === 0) {
        return [];
      }

      const textsByMessageId = await this.loadTextsByMessageId(
        selectableDatabase,
        companyId,
        persistedMessages.map((message) => message.id),
      );

      return [...persistedMessages]
        .sort((leftMessage, rightMessage) => leftMessage.createdAt.getTime() - rightMessage.createdAt.getTime())
        .map((message) => this.serializeMessage(message, textsByMessageId));
    });
  }

  private async loadTextsByMessageId(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    messageIds: string[],
  ): Promise<Map<string, string>> {
    const contentRows = await selectableDatabase
      .select({
        messageId: messageContents.messageId,
        text: messageContents.text,
        type: messageContents.type,
        createdAt: messageContents.createdAt,
      })
      .from(messageContents)
      .where(and(
        eq(messageContents.companyId, companyId),
        inArray(messageContents.messageId, messageIds),
      )) as MessageContentRow[];

    const textsByMessageId = new Map<string, string>();
    const orderedContentRows = [...contentRows].sort((leftContent, rightContent) => {
      return leftContent.createdAt.getTime() - rightContent.createdAt.getTime();
    });

    for (const contentRow of orderedContentRows) {
      if (contentRow.type !== "text" || !contentRow.text) {
        continue;
      }

      const currentText = textsByMessageId.get(contentRow.messageId) ?? "";
      textsByMessageId.set(
        contentRow.messageId,
        currentText.length > 0 ? `${currentText}\n${contentRow.text}` : contentRow.text,
      );
    }

    return textsByMessageId;
  }

  private serializeSession(sessionRow: SessionRow): SessionGraphqlRecord {
    return {
      id: sessionRow.id,
      agentId: sessionRow.agentId,
      modelId: sessionRow.currentModelId,
      reasoningLevel: sessionRow.currentReasoningLevel,
      inferredTitle: sessionRow.inferredTitle,
      isThinking: sessionRow.isThinking,
      status: sessionRow.status,
      thinkingText: sessionRow.thinkingText,
      createdAt: sessionRow.createdAt.toISOString(),
      updatedAt: sessionRow.updatedAt.toISOString(),
      userSetTitle: sessionRow.userSetTitle,
    };
  }

  private serializeMessage(
    messageRow: SessionMessageRow,
    textsByMessageId: Map<string, string>,
  ): SessionMessageGraphqlRecord {
    return {
      id: messageRow.id,
      sessionId: messageRow.sessionId,
      role: messageRow.role,
      status: messageRow.status,
      text: textsByMessageId.get(messageRow.id) ?? "",
      isError: messageRow.isError,
      createdAt: messageRow.createdAt.toISOString(),
      updatedAt: messageRow.updatedAt.toISOString(),
    };
  }
}
