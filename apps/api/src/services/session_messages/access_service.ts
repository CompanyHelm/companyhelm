import { and, asc, desc, eq, gt, ilike, inArray, lt, or, sql } from "drizzle-orm";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import {
  agentSessions,
  messageContents,
  sessionMessages,
} from "../../db/schema.ts";

type PastMessageCursor = {
  createdAt: string;
  messageId: string;
};

export type PastMessageContentRecord = {
  arguments: unknown | null;
  createdAt: Date;
  data: string | null;
  id: string;
  messageId: string;
  mimeType: string | null;
  structuredContent: unknown | null;
  text: string | null;
  toolCallId: string | null;
  toolName: string | null;
  type: string;
  updatedAt: Date;
};

export type PastMessageRecord = {
  contents?: PastMessageContentRecord[];
  createdAt: Date;
  errorMessage: string | null;
  id: string;
  isError: boolean;
  principalAgentId: string | null;
  principalSessionId: string | null;
  principalType: string;
  role: string;
  sessionId: string;
  status: string;
  taskRunId: string | null;
  toolCallId: string | null;
  toolName: string | null;
  turnId: string;
  updatedAt: Date;
  workflowRunId: string | null;
};

export type PastMessageConnectionRecord = {
  messages: PastMessageRecord[];
  nextCursor: string | null;
};

export type PastMessageListInput = {
  after?: string;
  agentId: string;
  before?: string;
  companyId: string;
  contentTypes?: string[];
  cursor?: string;
  includeContents?: boolean;
  limit?: number;
  principalTypes?: string[];
  roles?: string[];
  sessionId?: string;
  sort?: "asc" | "desc";
  statuses?: string[];
};

export type PastMessageGetInput = {
  agentId: string;
  companyId: string;
  contentTypes?: string[];
  includeContents?: boolean;
  messageId: string;
};

export type PastMessageSearchInput = PastMessageListInput & {
  query: string;
};

type PastMessageRow = Omit<PastMessageRecord, "contents">;

type PastMessageContentRow = PastMessageContentRecord;

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const CURSOR_PREFIX = "past-message:";

/**
 * Reads persisted session messages for the current agent across that agent's own sessions. This is
 * the service behind the Access past messages skill, so every query joins through `agent_sessions`
 * to make agent ownership part of the data access path rather than a caller-side convention.
 */
export class PastMessageAccessService {
  async listMessages(
    transactionProvider: TransactionProviderInterface,
    input: PastMessageListInput,
  ): Promise<PastMessageConnectionRecord> {
    return transactionProvider.transaction(async (tx) => {
      return this.listMessagesInTransaction(tx, input);
    });
  }

  async getMessage(
    transactionProvider: TransactionProviderInterface,
    input: PastMessageGetInput,
  ): Promise<PastMessageRecord> {
    return transactionProvider.transaction(async (tx) => {
      const messageRows = await tx
        .select(PastMessageAccessService.messageSelection())
        .from(sessionMessages)
        .innerJoin(agentSessions, eq(agentSessions.id, sessionMessages.sessionId))
        .where(and(
          eq(sessionMessages.companyId, input.companyId),
          eq(sessionMessages.id, input.messageId),
          eq(agentSessions.companyId, input.companyId),
          eq(agentSessions.agentId, input.agentId),
        )) as PastMessageRow[];
      const message = messageRows[0];
      if (!message) {
        throw new Error("Message not found.");
      }

      const messages = await this.attachContents(tx, input.companyId, [message], input.includeContents ?? true, input.contentTypes);
      return messages[0] as PastMessageRecord;
    });
  }

  async searchMessages(
    transactionProvider: TransactionProviderInterface,
    input: PastMessageSearchInput,
  ): Promise<PastMessageConnectionRecord> {
    if (!/\S/.test(input.query)) {
      throw new Error("query is required.");
    }

    return transactionProvider.transaction(async (tx) => {
      return this.listMessagesInTransaction(tx, input, this.buildContentSearchFilter(input));
    });
  }

  private async listMessagesInTransaction(
    tx: AppRuntimeTransaction,
    input: PastMessageListInput,
    extraFilter?: unknown,
  ): Promise<PastMessageConnectionRecord> {
    const pageSize = this.normalizePageSize(input.limit);
    const sort = input.sort ?? "desc";
    const cursor = this.decodeCursor(input.cursor);
    const filters = [
      eq(sessionMessages.companyId, input.companyId),
      eq(agentSessions.companyId, input.companyId),
      eq(agentSessions.agentId, input.agentId),
    ];

    if (input.sessionId) {
      filters.push(eq(sessionMessages.sessionId, input.sessionId));
    }
    if (cursor) {
      filters.push(this.buildCursorFilter(cursor, sort) as never);
    }
    if (input.after) {
      filters.push(gt(sessionMessages.createdAt, new Date(input.after)));
    }
    if (input.before) {
      filters.push(lt(sessionMessages.createdAt, new Date(input.before)));
    }
    if (input.roles && input.roles.length > 0) {
      filters.push(inArray(sessionMessages.role, input.roles as Array<"assistant" | "toolResult" | "user">));
    }
    if (input.statuses && input.statuses.length > 0) {
      filters.push(inArray(sessionMessages.status, input.statuses as Array<"completed" | "running">));
    }
    if (input.principalTypes && input.principalTypes.length > 0) {
      filters.push(inArray(
        sessionMessages.principalType,
        input.principalTypes as Array<"agent_message" | "github_webhook" | "schedule" | "task" | "user" | "workflow">,
      ));
    }
    if (extraFilter) {
      filters.push(extraFilter as never);
    }

    const orderByColumns = this.buildOrderBy(sort);
    const messageRows = await tx
      .select(PastMessageAccessService.messageSelection())
      .from(sessionMessages)
      .innerJoin(agentSessions, eq(agentSessions.id, sessionMessages.sessionId))
      .where(and(...filters))
      .orderBy(orderByColumns[0], orderByColumns[1])
      .limit(pageSize + 1) as PastMessageRow[];

    const hasNextPage = messageRows.length > pageSize;
    const pageMessages = hasNextPage ? messageRows.slice(0, pageSize) : messageRows;
    const messages = await this.attachContents(
      tx,
      input.companyId,
      pageMessages,
      input.includeContents ?? true,
      input.contentTypes,
    );

    return {
      messages,
      nextCursor: hasNextPage ? this.encodeCursor(pageMessages.at(-1) as PastMessageRow) : null,
    };
  }

  private async attachContents(
    tx: AppRuntimeTransaction,
    companyId: string,
    messages: PastMessageRow[],
    includeContents: boolean,
    contentTypes?: string[],
  ): Promise<PastMessageRecord[]> {
    if (!includeContents || messages.length === 0) {
      return messages;
    }

    const contentFilters = [
      eq(messageContents.companyId, companyId),
      inArray(messageContents.messageId, messages.map((message) => message.id)),
    ];
    if (contentTypes && contentTypes.length > 0) {
      contentFilters.push(inArray(messageContents.type, contentTypes as Array<"image" | "text" | "thinking" | "toolCall">));
    }

    const contentRows = await tx
      .select({
        arguments: messageContents.arguments,
        createdAt: messageContents.createdAt,
        data: messageContents.data,
        id: messageContents.id,
        messageId: messageContents.messageId,
        mimeType: messageContents.mimeType,
        structuredContent: messageContents.structuredContent,
        text: messageContents.text,
        toolCallId: messageContents.toolCallId,
        toolName: messageContents.toolName,
        type: messageContents.type,
        updatedAt: messageContents.updatedAt,
      })
      .from(messageContents)
      .where(and(...contentFilters))
      .orderBy(asc(messageContents.createdAt), asc(messageContents.id)) as PastMessageContentRow[];

    const contentsByMessageId = new Map<string, PastMessageContentRow[]>();
    for (const contentRow of contentRows) {
      const existingContents = contentsByMessageId.get(contentRow.messageId) ?? [];
      existingContents.push(contentRow);
      contentsByMessageId.set(contentRow.messageId, existingContents);
    }

    return messages.map((message) => ({
      ...message,
      contents: contentsByMessageId.get(message.id) ?? [],
    }));
  }

  private buildContentSearchFilter(input: PastMessageSearchInput): unknown {
    const contentSearchFilters = [
      eq(messageContents.companyId, input.companyId),
      eq(messageContents.messageId, sessionMessages.id),
      ilike(messageContents.text, `%${input.query}%`),
    ];
    if (input.contentTypes && input.contentTypes.length > 0) {
      contentSearchFilters.push(inArray(messageContents.type, input.contentTypes as Array<"image" | "text" | "thinking" | "toolCall">));
    }

    return sql`exists (select 1 from ${messageContents} where ${and(...contentSearchFilters)})`;
  }

  private buildCursorFilter(cursor: PastMessageCursor, sort: "asc" | "desc"): unknown {
    const cursorCreatedAt = new Date(cursor.createdAt);
    if (sort === "asc") {
      return or(
        gt(sessionMessages.createdAt, cursorCreatedAt),
        and(
          eq(sessionMessages.createdAt, cursorCreatedAt),
          gt(sessionMessages.id, cursor.messageId),
        ),
      );
    }

    return or(
      lt(sessionMessages.createdAt, cursorCreatedAt),
      and(
        eq(sessionMessages.createdAt, cursorCreatedAt),
        lt(sessionMessages.id, cursor.messageId),
      ),
    );
  }

  private buildOrderBy(sort: "asc" | "desc") {
    return sort === "asc"
      ? [asc(sessionMessages.createdAt), asc(sessionMessages.id)]
      : [desc(sessionMessages.createdAt), desc(sessionMessages.id)];
  }

  private normalizePageSize(limit?: number): number {
    if (!Number.isInteger(limit) || Number(limit) <= 0) {
      return DEFAULT_PAGE_SIZE;
    }

    return Math.min(Number(limit), MAX_PAGE_SIZE);
  }

  private decodeCursor(cursor?: string): PastMessageCursor | null {
    if (!cursor) {
      return null;
    }

    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    if (!decoded.startsWith(CURSOR_PREFIX)) {
      throw new Error("Invalid cursor.");
    }

    const [createdAt = "", messageId = ""] = decoded.slice(CURSOR_PREFIX.length).split("|");
    if (!createdAt || !messageId) {
      throw new Error("Invalid cursor.");
    }

    return { createdAt, messageId };
  }

  private encodeCursor(message: PastMessageRow): string {
    return Buffer.from(
      `${CURSOR_PREFIX}${message.createdAt.toISOString()}|${message.id}`,
      "utf8",
    ).toString("base64url");
  }

  private static messageSelection() {
    return {
      createdAt: sessionMessages.createdAt,
      errorMessage: sessionMessages.errorMessage,
      id: sessionMessages.id,
      isError: sessionMessages.isError,
      principalAgentId: sessionMessages.principalAgentId,
      principalSessionId: sessionMessages.principalSessionId,
      principalType: sessionMessages.principalType,
      role: sessionMessages.role,
      sessionId: sessionMessages.sessionId,
      status: sessionMessages.status,
      taskRunId: sessionMessages.taskRunId,
      toolCallId: sessionMessages.toolCallId,
      toolName: sessionMessages.toolName,
      turnId: sessionMessages.turnId,
      updatedAt: sessionMessages.updatedAt,
      workflowRunId: sessionMessages.workflowRunId,
    };
  }
}
