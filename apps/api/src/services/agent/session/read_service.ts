import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { injectable } from "inversify";
import {
  agentSessions,
  messageContents,
  modelProviderCredentialModels,
  sessionMessages,
  sessionTurns,
  userSessionReads,
} from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";

type SessionRow = {
  id: string;
  agentId: string;
  currentContextTokens: number | null;
  currentModelProviderCredentialModelId: string;
  currentReasoningLevel: string;
  forkedFromTurnId: string | null;
  inferredTitle: string | null;
  isCompacting: boolean;
  isThinking: boolean;
  maxContextTokens: number | null;
  ownerUserId: string | null;
  status: string;
  thinkingText: string | null;
  createdAt: Date;
  updatedAt: Date;
  userSetTitle: string | null;
};

type SessionMessageRow = {
  id: string;
  sessionId: string;
  turnId: string;
  role: string;
  status: string;
  toolCallId: string | null;
  toolName: string | null;
  isError: boolean;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SessionTurnRow = {
  id: string;
  sessionId: string;
  startedAt: Date;
  endedAt: Date | null;
};

type SessionForkSourceTurnRow = {
  id: string;
  sessionId: string;
};

type SessionForkSourceSessionRow = {
  agentId: string;
  id: string;
  inferredTitle: string | null;
  userSetTitle: string | null;
};

type SessionForkSourceRecord = {
  agentId: string;
  sessionId: string;
  title: string | null;
};

type MessageContentRow = {
  arguments: unknown | null;
  messageId: string;
  data: string | null;
  mimeType: string | null;
  structuredContent: unknown | null;
  text: string | null;
  toolCallId: string | null;
  toolName: string | null;
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
  currentContextTokens: number | null;
  forkedFromSessionAgentId: string | null;
  forkedFromSessionId: string | null;
  forkedFromSessionTitle: string | null;
  forkedFromTurnId: string | null;
  hasUnread: boolean;
  modelProviderCredentialModelId: string | null;
  modelId: string;
  reasoningLevel: string;
  inferredTitle: string | null;
  isCompacting: boolean;
  isThinking: boolean;
  maxContextTokens: number | null;
  status: string;
  thinkingText: string | null;
  createdAt: string;
  updatedAt: string;
  userSetTitle: string | null;
};

export type SessionMessageGraphqlRecord = {
  id: string;
  sessionId: string;
  turnId: string;
  turn: SessionTurnGraphqlRecord;
  role: string;
  status: string;
  toolCallId: string | null;
  toolName: string | null;
  contents: SessionMessageContentGraphqlRecord[];
  text: string;
  isError: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SessionTurnGraphqlRecord = {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
};

export type SessionMessageContentGraphqlRecord = {
  arguments: unknown | null;
  type: string;
  text: string | null;
  data: string | null;
  mimeType: string | null;
  structuredContent: unknown | null;
  toolCallId: string | null;
  toolName: string | null;
};

type PageInfoGraphqlRecord = {
  hasNextPage: boolean;
  endCursor: string | null;
};

type SessionModelRecord = {
  id: string;
  modelId: string;
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
    userId: string,
  ): Promise<SessionGraphqlRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const sessionRows = await selectableDatabase
        .select({
          id: agentSessions.id,
          agentId: agentSessions.agentId,
          currentContextTokens: agentSessions.currentContextTokens,
          currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          forkedFromTurnId: agentSessions.forkedFromTurnId,
          inferredTitle: agentSessions.inferredTitle,
          isCompacting: agentSessions.isCompacting,
          isThinking: agentSessions.isThinking,
          maxContextTokens: agentSessions.maxContextTokens,
          ownerUserId: agentSessions.ownerUserId,
          status: agentSessions.status,
          thinkingText: agentSessions.thinkingText,
          createdAt: agentSessions.created_at,
          updatedAt: agentSessions.updated_at,
          userSetTitle: agentSessions.userSetTitle,
        })
        .from(agentSessions)
        .where(eq(agentSessions.companyId, companyId)) as SessionRow[];
      const accessibleSessionRows = sessionRows.filter((sessionRow) => this.canUserAccessSession(sessionRow.ownerUserId, userId));
      const forkSourceBySessionId = await this.loadForkSourcesBySessionId(selectableDatabase, companyId, accessibleSessionRows);
      const modelOptionIdBySessionKey = await this.loadSessionModelOptionIds(
        selectableDatabase,
        companyId,
        accessibleSessionRows,
      );
      const readSessionIds = await this.loadReadSessionIds(
        selectableDatabase,
        companyId,
        userId,
        accessibleSessionRows.map((sessionRow) => sessionRow.id),
      );

      return [...accessibleSessionRows]
        .sort((leftSession, rightSession) => rightSession.updatedAt.getTime() - leftSession.updatedAt.getTime())
        .map((sessionRow) => this.serializeSession(
          sessionRow,
          forkSourceBySessionId,
          modelOptionIdBySessionKey,
          readSessionIds.has(sessionRow.id),
        ));
    });
  }

  async getSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    userId: string,
  ): Promise<SessionGraphqlRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const sessionRows = await selectableDatabase
        .select({
          id: agentSessions.id,
          agentId: agentSessions.agentId,
          currentContextTokens: agentSessions.currentContextTokens,
          currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          forkedFromTurnId: agentSessions.forkedFromTurnId,
          inferredTitle: agentSessions.inferredTitle,
          isCompacting: agentSessions.isCompacting,
          isThinking: agentSessions.isThinking,
          maxContextTokens: agentSessions.maxContextTokens,
          ownerUserId: agentSessions.ownerUserId,
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
      if (!sessionRow || !this.canUserAccessSession(sessionRow.ownerUserId, userId)) {
        return null;
      }

      const modelOptionIdBySessionKey = await this.loadSessionModelOptionIds(
        selectableDatabase,
        companyId,
        [sessionRow],
      );
      const forkSourceBySessionId = await this.loadForkSourcesBySessionId(selectableDatabase, companyId, [sessionRow]);
      const readSessionIds = await this.loadReadSessionIds(selectableDatabase, companyId, userId, [sessionId]);
      return this.serializeSession(sessionRow, forkSourceBySessionId, modelOptionIdBySessionKey, readSessionIds.has(sessionId));
    });
  }

  async listMessages(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    userId: string,
  ): Promise<SessionMessageGraphqlRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const accessibleSessionIds = await this.loadAccessibleSessionIds(selectableDatabase, companyId, userId);
      if (accessibleSessionIds.length === 0) {
        return [];
      }

      return this.listMessagesForFilterInTransaction(
        selectableDatabase,
        companyId,
        accessibleSessionIds,
      );
    });
  }

  async listTranscriptMessages(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    userId: string,
    first?: number | null,
    after?: string | null,
  ): Promise<SessionTranscriptMessageConnectionGraphqlRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const accessibleSessionIds = await this.loadAccessibleSessionIds(selectableDatabase, companyId, userId, [sessionId]);
      if (accessibleSessionIds.length === 0) {
        throw new Error("Session not found.");
      }
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
          turnId: sessionMessages.turnId,
          role: sessionMessages.role,
          status: sessionMessages.status,
          toolCallId: sessionMessages.toolCallId,
          toolName: sessionMessages.toolName,
          isError: sessionMessages.isError,
          errorMessage: sessionMessages.errorMessage,
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

      const contentsByMessageId = await this.loadContentsByMessageId(
        selectableDatabase,
        companyId,
        pageMessages.map((message) => message.id),
      );
      const turnsById = await this.loadTurnsById(
        selectableDatabase,
        companyId,
        pageMessages.map((message) => message.turnId),
      );

      const edges = pageMessages.map((message) => {
        const node = this.serializeMessage(message, contentsByMessageId, turnsById);
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
    userId: string,
  ): Promise<SessionMessageGraphqlRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const persistedMessages = await selectableDatabase
        .select({
          id: sessionMessages.id,
          sessionId: sessionMessages.sessionId,
          turnId: sessionMessages.turnId,
          role: sessionMessages.role,
          status: sessionMessages.status,
          toolCallId: sessionMessages.toolCallId,
          toolName: sessionMessages.toolName,
          isError: sessionMessages.isError,
          errorMessage: sessionMessages.errorMessage,
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
      const accessibleSessionIds = await this.loadAccessibleSessionIds(
        selectableDatabase,
        companyId,
        userId,
        [persistedMessage.sessionId],
      );
      if (accessibleSessionIds.length === 0) {
        return null;
      }

      const contentsByMessageId = await this.loadContentsByMessageId(selectableDatabase, companyId, [persistedMessage.id]);
      const turnsById = await this.loadTurnsById(selectableDatabase, companyId, [persistedMessage.turnId]);
      return this.serializeMessage(persistedMessage, contentsByMessageId, turnsById);
    });
  }

  private async listMessagesForFilterInTransaction(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    sessionIds?: ReadonlyArray<string>,
  ): Promise<SessionMessageGraphqlRecord[]> {
    if (sessionIds && sessionIds.length === 0) {
      return [];
    }
    const persistedMessages = await selectableDatabase
      .select({
        id: sessionMessages.id,
        sessionId: sessionMessages.sessionId,
        turnId: sessionMessages.turnId,
        role: sessionMessages.role,
        status: sessionMessages.status,
        toolCallId: sessionMessages.toolCallId,
        toolName: sessionMessages.toolName,
        isError: sessionMessages.isError,
        errorMessage: sessionMessages.errorMessage,
        createdAt: sessionMessages.createdAt,
        updatedAt: sessionMessages.updatedAt,
      })
      .from(sessionMessages)
      .where(sessionIds
        ? and(
          eq(sessionMessages.companyId, companyId),
          inArray(sessionMessages.sessionId, [...sessionIds]),
        )
        : eq(sessionMessages.companyId, companyId)) as SessionMessageRow[];

    if (persistedMessages.length === 0) {
      return [];
    }

    const contentsByMessageId = await this.loadContentsByMessageId(
      selectableDatabase,
      companyId,
      persistedMessages.map((message) => message.id),
    );
    const turnsById = await this.loadTurnsById(
      selectableDatabase,
      companyId,
      persistedMessages.map((message) => message.turnId),
    );

    return [...persistedMessages]
      .sort((leftMessage, rightMessage) => leftMessage.createdAt.getTime() - rightMessage.createdAt.getTime())
      .map((message) => this.serializeMessage(message, contentsByMessageId, turnsById));
  }

  private async loadTurnsById(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    turnIds: ReadonlyArray<string>,
  ): Promise<Map<string, SessionTurnGraphqlRecord>> {
    const uniqueTurnIds = [...new Set(turnIds)];
    if (uniqueTurnIds.length === 0) {
      return new Map();
    }

    const turnRows = await selectableDatabase
      .select({
        endedAt: sessionTurns.endedAt,
        id: sessionTurns.id,
        sessionId: sessionTurns.sessionId,
        startedAt: sessionTurns.startedAt,
      })
      .from(sessionTurns)
      .where(and(
        eq(sessionTurns.companyId, companyId),
        inArray(sessionTurns.id, uniqueTurnIds),
      )) as SessionTurnRow[];

    return new Map(
      turnRows.map((turnRow) => [turnRow.id, {
        endedAt: turnRow.endedAt?.toISOString() ?? null,
        id: turnRow.id,
        sessionId: turnRow.sessionId,
        startedAt: turnRow.startedAt.toISOString(),
      }]),
    );
  }

  private async loadContentsByMessageId(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    messageIds: string[],
  ): Promise<Map<string, SessionMessageContentGraphqlRecord[]>> {
    const contentRows = await selectableDatabase
      .select({
        arguments: messageContents.arguments,
        messageId: messageContents.messageId,
        data: messageContents.data,
        mimeType: messageContents.mimeType,
        structuredContent: messageContents.structuredContent,
        text: messageContents.text,
        toolCallId: messageContents.toolCallId,
        toolName: messageContents.toolName,
        type: messageContents.type,
        createdAt: messageContents.createdAt,
      })
      .from(messageContents)
      .where(and(
        eq(messageContents.companyId, companyId),
        inArray(messageContents.messageId, messageIds),
      )) as MessageContentRow[];

    const contentsByMessageId = new Map<string, SessionMessageContentGraphqlRecord[]>();
    const orderedContentRows = [...contentRows].sort((leftContent, rightContent) => {
      return leftContent.createdAt.getTime() - rightContent.createdAt.getTime();
    });

    for (const contentRow of orderedContentRows) {
      const currentContents = contentsByMessageId.get(contentRow.messageId) ?? [];
      currentContents.push({
        arguments: contentRow.arguments,
        data: contentRow.data,
        mimeType: contentRow.mimeType,
        structuredContent: contentRow.structuredContent,
        text: contentRow.text,
        toolCallId: contentRow.toolCallId,
        toolName: contentRow.toolName,
        type: contentRow.type,
      });
      contentsByMessageId.set(contentRow.messageId, currentContents);
    }

    return contentsByMessageId;
  }

  private async loadSessionModelOptionIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    sessionRows: ReadonlyArray<SessionRow>,
  ): Promise<Map<string, string>> {
    const modelProviderCredentialModelIds = [...new Set(
      sessionRows.map((sessionRow) => sessionRow.currentModelProviderCredentialModelId),
    )];
    if (modelProviderCredentialModelIds.length === 0) {
      return new Map();
    }

    const modelRecords = await selectableDatabase
      .select({
        id: modelProviderCredentialModels.id,
        modelId: modelProviderCredentialModels.modelId,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        inArray(modelProviderCredentialModels.id, modelProviderCredentialModelIds),
      )) as SessionModelRecord[];

    return new Map(
      modelRecords.map((modelRecord) => [modelRecord.id, modelRecord.modelId]),
    );
  }

  private async loadReadSessionIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    userId: string,
    sessionIds: ReadonlyArray<string>,
  ): Promise<Set<string>> {
    if (sessionIds.length === 0) {
      return new Set();
    }

    const readRows = await selectableDatabase
      .select({
        sessionId: userSessionReads.sessionId,
      })
      .from(userSessionReads)
      .where(and(
        eq(userSessionReads.companyId, companyId),
        eq(userSessionReads.userId, userId),
        inArray(userSessionReads.sessionId, [...sessionIds]),
      )) as Array<{ sessionId: string }>;

    return new Set(readRows.map((readRow) => readRow.sessionId));
  }

  private async loadAccessibleSessionIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    userId: string,
    sessionIds?: ReadonlyArray<string>,
  ): Promise<string[]> {
    const uniqueSessionIds = sessionIds ? [...new Set(sessionIds)] : null;
    if (uniqueSessionIds && uniqueSessionIds.length === 0) {
      return [];
    }

    const sessionRows = await selectableDatabase
      .select({
        id: agentSessions.id,
        ownerUserId: agentSessions.ownerUserId,
      })
      .from(agentSessions)
      .where(uniqueSessionIds
        ? and(
          eq(agentSessions.companyId, companyId),
          inArray(agentSessions.id, uniqueSessionIds),
        )
        : eq(agentSessions.companyId, companyId)) as Array<{ id: string; ownerUserId: string | null }>;

    return sessionRows
      .filter((sessionRow) => this.canUserAccessSession(sessionRow.ownerUserId, userId))
      .map((sessionRow) => sessionRow.id);
  }

  /**
   * Resolves each forked session's immediate source session so the web app can render a lightweight
   * banner linking back to the source conversation without replaying ancestor transcript rows.
   */
  private async loadForkSourcesBySessionId(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    sessionRows: ReadonlyArray<SessionRow>,
  ): Promise<Map<string, SessionForkSourceRecord>> {
    const forkedSessionRows = sessionRows.filter((sessionRow) => typeof sessionRow.forkedFromTurnId === "string");
    if (forkedSessionRows.length === 0) {
      return new Map();
    }

    const forkSourceTurnIds = [...new Set(
      forkedSessionRows
        .map((sessionRow) => sessionRow.forkedFromTurnId)
        .filter((turnId) => typeof turnId === "string"),
    )];
    if (forkSourceTurnIds.length === 0) {
      return new Map();
    }

    const forkSourceTurnRows = await selectableDatabase
      .select({
        id: sessionTurns.id,
        sessionId: sessionTurns.sessionId,
      })
      .from(sessionTurns)
      .where(and(
        eq(sessionTurns.companyId, companyId),
        inArray(sessionTurns.id, forkSourceTurnIds),
      )) as SessionForkSourceTurnRow[];
    if (forkSourceTurnRows.length === 0) {
      return new Map();
    }

    const sourceSessionIds = [...new Set(forkSourceTurnRows.map((turnRow) => turnRow.sessionId))];
    const sourceSessionRows = await selectableDatabase
      .select({
        agentId: agentSessions.agentId,
        id: agentSessions.id,
        inferredTitle: agentSessions.inferredTitle,
        userSetTitle: agentSessions.userSetTitle,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        inArray(agentSessions.id, sourceSessionIds),
      )) as SessionForkSourceSessionRow[];

    const forkSourceTurnById = new Map(forkSourceTurnRows.map((turnRow) => [turnRow.id, turnRow]));
    const sourceSessionById = new Map(sourceSessionRows.map((sessionRow) => [sessionRow.id, sessionRow]));
    const forkSourceBySessionId = new Map<string, SessionForkSourceRecord>();

    for (const sessionRow of forkedSessionRows) {
      const forkSourceTurnId = sessionRow.forkedFromTurnId;
      if (!forkSourceTurnId) {
        continue;
      }

      const forkSourceTurn = forkSourceTurnById.get(forkSourceTurnId);
      if (!forkSourceTurn) {
        continue;
      }

      const sourceSession = sourceSessionById.get(forkSourceTurn.sessionId);
      if (!sourceSession) {
        continue;
      }

      forkSourceBySessionId.set(sessionRow.id, {
        agentId: sourceSession.agentId,
        sessionId: sourceSession.id,
        title: sourceSession.userSetTitle ?? sourceSession.inferredTitle ?? null,
      });
    }

    return forkSourceBySessionId;
  }

  private serializeSession(
    sessionRow: SessionRow,
    forkSourceBySessionId: Map<string, SessionForkSourceRecord>,
    modelIdByModelRecordId: Map<string, string>,
    isRead: boolean,
  ): SessionGraphqlRecord {
    const modelId = modelIdByModelRecordId.get(sessionRow.currentModelProviderCredentialModelId);
    if (!modelId) {
      throw new Error("Session model not found.");
    }
    const forkSource = forkSourceBySessionId.get(sessionRow.id) ?? null;

    return {
      id: sessionRow.id,
      agentId: sessionRow.agentId,
      currentContextTokens: sessionRow.currentContextTokens,
      forkedFromSessionAgentId: forkSource?.agentId ?? null,
      forkedFromSessionId: forkSource?.sessionId ?? null,
      forkedFromSessionTitle: forkSource?.title ?? null,
      forkedFromTurnId: sessionRow.forkedFromTurnId,
      hasUnread: !isRead,
      modelProviderCredentialModelId: sessionRow.currentModelProviderCredentialModelId,
      modelId,
      reasoningLevel: sessionRow.currentReasoningLevel,
      inferredTitle: sessionRow.inferredTitle,
      isCompacting: sessionRow.isCompacting,
      isThinking: sessionRow.isThinking,
      maxContextTokens: sessionRow.maxContextTokens,
      status: sessionRow.status,
      thinkingText: sessionRow.thinkingText,
      createdAt: sessionRow.createdAt.toISOString(),
      updatedAt: sessionRow.updatedAt.toISOString(),
      userSetTitle: sessionRow.userSetTitle,
    };
  }

  private serializeMessage(
    messageRow: SessionMessageRow,
    contentsByMessageId: Map<string, SessionMessageContentGraphqlRecord[]>,
    turnsById: Map<string, SessionTurnGraphqlRecord>,
  ): SessionMessageGraphqlRecord {
    const contents = contentsByMessageId.get(messageRow.id) ?? [];
    const text = contents
      .filter((content) => content.type === "text" && typeof content.text === "string" && content.text.length > 0)
      .map((content) => content.text as string)
      .join("\n");

    const turn = turnsById.get(messageRow.turnId);
    if (!turn) {
      throw new Error("Session turn not found.");
    }

    return {
      contents,
      id: messageRow.id,
      sessionId: messageRow.sessionId,
      turn,
      turnId: messageRow.turnId,
      role: messageRow.role,
      status: messageRow.status,
      toolCallId: messageRow.toolCallId,
      toolName: messageRow.toolName,
      text,
      isError: messageRow.isError,
      errorMessage: messageRow.errorMessage,
      createdAt: messageRow.createdAt.toISOString(),
      updatedAt: messageRow.updatedAt.toISOString(),
    };
  }

  private canUserAccessSession(ownerUserId: string | null, userId: string): boolean {
    return ownerUserId === null || ownerUserId === userId;
  }
}
