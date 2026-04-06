import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import pino, { type Logger as PinoLogger } from "pino";
import { agentSessions, messageContents, sessionMessages, sessionQueuedMessages, sessionTurns } from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { RedisCompanyScopedService } from "../../../redis/company_scoped_service.ts";
import { RedisService } from "../../../redis/service.ts";
import { SessionProcessPubSubNames } from "../process/pub_sub_names.ts";
import { UserSessionReadService } from "../user_session_read_service.ts";

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): Promise<unknown>;
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<void>;
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<void>;
  };
};

type TextContent = {
  type?: string;
  text?: string;
};

type ImageContent = {
  type?: string;
  data?: string;
  mimeType?: string;
};

type ThinkingContent = {
  type?: string;
  thinking?: string;
};

type ToolCallContent = {
  type?: string;
  arguments?: unknown;
  id?: string;
  name?: string;
};

type MessageContent = TextContent | ImageContent | ThinkingContent | ToolCallContent;

type ToolExecutionResult = {
  content?: unknown;
  details?: unknown;
};

type TerminalStructuredContent = {
  type: "terminal";
  command: string;
  completed: boolean;
  cwd: string | null;
  exitCode: number | null;
  sessionId: string;
};

type SessionMessage = {
  content?: string | MessageContent[];
  errorMessage?: string;
  isError?: boolean;
  role?: string;
  structuredContent?: TerminalStructuredContent | null;
  stopReason?: string;
  timestamp?: number;
  toolCallId?: string;
  toolName?: string;
};

type SessionEvent = {
  assistantMessageEvent?: {
    content?: string;
    contentIndex?: number;
    delta?: string;
    type?: string;
  };
  isError?: boolean;
  type?: string;
  args?: unknown;
  message?: SessionMessage;
  partialResult?: unknown;
  result?: unknown;
  toolCallId?: string;
  toolName?: string;
  toolResults?: unknown;
};

type PiMonoSessionContextSnapshot = {
  currentContextTokens: number | null;
  isCompacting: boolean;
  maxContextTokens: number | null;
};

type QueuedUserMessageDispatch = {
  dispatched: boolean;
  queuedMessageId: string | null;
  timestamp: Date;
};

type PiMonoSessionEventHandlerDependencies = {
  contextSnapshotProvider?: () => PiMonoSessionContextSnapshot;
  logger?: PinoLogger;
  sessionProcessPubSubNames?: SessionProcessPubSubNames;
  userSessionReadService?: UserSessionReadService;
};

/**
 * Owns PI Mono session-event handling for one live session. Its scope is to classify the runtime
 * events emitted by the SDK, keep the persisted session lifecycle aligned with agent execution,
 * and make unsupported event shapes noisy in logs so persistence work can expand deliberately.
 */
export class PiMonoSessionEventHandler {
  private static readonly fallbackLogger = pino({
    level: "silent",
  });

  private readonly redisService: RedisService;
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly sessionId: string;
  private readonly logger: PinoLogger;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly userSessionReadService: UserSessionReadService;
  private readonly contextSnapshotProvider: () => PiMonoSessionContextSnapshot;
  private readonly messageIdByEventKey = new Map<string, string>();
  private readonly messageIdsByTurnId = new Map<string, Set<string>>();
  private readonly contentIdsByMessageId = new Map<string, string[]>();
  private readonly persistedMessageIds = new Set<string>();
  private readonly queuedUserMessageDispatches: QueuedUserMessageDispatch[] = [];
  private readonly completedToolExecutionKeys = new Set<string>();
  private eventChain: Promise<void> = Promise.resolve();
  private companyId?: string;
  private currentTurnId: string | null = null;
  private isThinking = false;
  private thinkingText = "";
  private persistedThinkingContent = "";
  private lastPersistedTimestampMilliseconds = 0;

  constructor(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    redisService: RedisService,
    dependencies: PiMonoSessionEventHandlerDependencies = {},
  ) {
    this.redisService = redisService;
    this.transactionProvider = transactionProvider;
    this.sessionId = sessionId;
    this.logger = (dependencies.logger ?? PiMonoSessionEventHandler.fallbackLogger).child({
      component: "pi_mono_session_event_handler",
      sessionId,
    });
    this.contextSnapshotProvider = dependencies.contextSnapshotProvider ?? (() => ({
      currentContextTokens: null,
      isCompacting: false,
      maxContextTokens: null,
    }));
    this.sessionProcessPubSubNames = dependencies.sessionProcessPubSubNames ?? new SessionProcessPubSubNames();
    this.userSessionReadService = dependencies.userSessionReadService ?? new UserSessionReadService();
  }

  async handle(event: unknown): Promise<void> {
    const queuedEvent = this.eventChain.then(async () => {
      await this.handleEvent(event);
    });
    this.eventChain = queuedEvent.catch(() => {});
    return queuedEvent;
  }

  queueUserMessageTimestamp(timestamp: Date, queuedMessageId?: string | null): void {
    this.queuedUserMessageDispatches.push({
      dispatched: false,
      queuedMessageId: queuedMessageId ? String(queuedMessageId).trim() : null,
      timestamp,
    });
  }

  async startPromptTurn(startedAt: Date = new Date()): Promise<string> {
    if (this.currentTurnId) {
      return this.currentTurnId;
    }

    const companyId = await this.resolveCompanyId();
    const turnId = randomUUID();
    await this.transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      await insertableDatabase.insert(sessionTurns).values({
        companyId,
        endedAt: null,
        id: turnId,
        sessionId: this.sessionId,
        startedAt,
      });
    });
    this.currentTurnId = turnId;
    return turnId;
  }

  async finishPromptTurn(endedAt: Date = new Date()): Promise<void> {
    const currentTurnId = this.currentTurnId;
    if (!currentTurnId) {
      return;
    }

    await this.waitForIdle();
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(sessionTurns)
        .set({
          endedAt,
        })
        .where(eq(sessionTurns.id, currentTurnId));
    });
    await this.publishTurnMessageUpdates(currentTurnId);
    this.messageIdsByTurnId.delete(currentTurnId);
    this.currentTurnId = null;
  }

  private async waitForIdle(): Promise<void> {
    let currentEventChain: Promise<void>;
    do {
      currentEventChain = this.eventChain;
      await currentEventChain;
    } while (currentEventChain !== this.eventChain);
  }

  private async handleEvent(event: unknown): Promise<void> {
    const sessionEvent = event as SessionEvent;
    switch (sessionEvent.type) {
      case "agent_start":
        await this.handleAgentStart(sessionEvent);
        return;
      case "agent_end":
        await this.handleAgentEnd(sessionEvent);
        return;
      case "turn_start":
        this.logDebug("pi mono turn started", sessionEvent);
        return;
      case "turn_end":
        this.logDebug("pi mono turn ended", sessionEvent);
        return;
      case "message_start":
        await this.handleMessageStart(sessionEvent);
        return;
      case "message_update":
        await this.handleMessageUpdate(sessionEvent);
        return;
      case "message_end":
        await this.handleMessageEnd(sessionEvent);
        return;
      case "tool_execution_start":
        await this.handleToolExecutionStart(sessionEvent);
        return;
      case "tool_execution_update":
        await this.handleToolExecutionUpdate(sessionEvent);
        return;
      case "tool_execution_end":
        await this.handleToolExecutionEnd(sessionEvent);
        return;
      case "auto_compaction_start":
        await this.handleAutoCompactionStart(sessionEvent);
        return;
      case "auto_compaction_end":
        await this.handleAutoCompactionEnd(sessionEvent);
        return;
      default:
        this.logError("unhandled pi mono session event", sessionEvent);
    }
  }

  private async updateSessionStatus(status: "running" | "stopped"): Promise<void> {
    this.isThinking = false;
    this.thinkingText = "";
    await this.persistSessionState({
      isThinking: false,
      status,
      thinkingText: null,
    }, true, true);
  }

  private async handleAgentStart(sessionEvent: SessionEvent): Promise<void> {
    this.logDebug("pi mono agent started", sessionEvent);
    await this.updateSessionStatus("running");
  }

  private async handleAgentEnd(sessionEvent: SessionEvent): Promise<void> {
    this.logDebug("pi mono agent ended", sessionEvent);
    const companyId = await this.resolveCompanyId();
    await this.userSessionReadService.clearSessionReads(this.transactionProvider, {
      companyId,
      sessionId: this.sessionId,
    });
    await this.updateSessionStatus("stopped");
  }

  private async handleAutoCompactionStart(sessionEvent: SessionEvent): Promise<void> {
    this.logDebug("pi mono auto compaction started", sessionEvent);
    await this.persistSessionState({}, true, true);
  }

  private async handleAutoCompactionEnd(sessionEvent: SessionEvent): Promise<void> {
    this.logDebug("pi mono auto compaction ended", sessionEvent);
    await this.persistSessionState({}, true, true);
  }

  private async handleMessageStart(sessionEvent: SessionEvent): Promise<void> {
    switch (sessionEvent.message?.role) {
      case "user":
        await this.markQueuedUserMessageDispatched(sessionEvent);
        this.logDebug("ignoring pi mono user message start", sessionEvent);
        return;
      case "assistant":
        this.persistedThinkingContent = "";
        await this.upsertSessionMessage("running", sessionEvent);
        this.logDebug("pi mono assistant message started", sessionEvent);
        return;
      case "toolResult":
      if (this.hasTrackedToolExecutionMessage(sessionEvent.message)) {
        this.logDebug("ignoring pi mono tool result start after tool execution events", sessionEvent);
        return;
      }
        await this.upsertSessionMessage("running", sessionEvent);
        this.logDebug("pi mono tool result message started", sessionEvent);
        return;
      default:
        this.logError("unhandled pi mono message_start event", sessionEvent);
    }
  }

  private async handleMessageUpdate(sessionEvent: SessionEvent): Promise<void> {
    if (sessionEvent.message?.role === "assistant") {
      await this.processAssistantThinkingEvent(sessionEvent);
      await this.upsertSessionMessage("running", sessionEvent);
      this.logDebug("pi mono assistant message updated", sessionEvent);
      return;
    }

    this.logError("unhandled pi mono message_update event", sessionEvent);
  }

  private async handleMessageEnd(sessionEvent: SessionEvent): Promise<void> {
    switch (sessionEvent.message?.role) {
      case "user": {
        const queuedUserMessageDispatch = this.shiftQueuedUserMessageDispatch();
        const userMessageTimestamp = queuedUserMessageDispatch?.timestamp
          ?? this.resolveMessageTimestamp(sessionEvent.message.timestamp);
        await this.upsertSessionMessage("completed", sessionEvent, userMessageTimestamp);
        if (queuedUserMessageDispatch?.queuedMessageId) {
          await this.deleteQueuedUserMessage(queuedUserMessageDispatch.queuedMessageId);
        }
        this.logDebug("pi mono user message completed", sessionEvent);
        return;
      }
      case "assistant":
        await this.upsertSessionMessage("completed", sessionEvent);
        await this.clearThinkingState(true, true);
        this.persistedThinkingContent = "";
        this.logDebug("pi mono assistant message completed", sessionEvent);
        return;
      case "toolResult":
        if (this.hasTrackedToolExecutionMessage(sessionEvent.message)) {
          this.logDebug("ignoring pi mono tool result end after tool execution events", sessionEvent);
          return;
        }
        await this.upsertSessionMessage("completed", sessionEvent);
        this.logDebug("pi mono tool result message completed", sessionEvent);
        return;
      default:
        this.logError("unhandled pi mono message_end event", sessionEvent);
    }
  }

  private async upsertSessionMessage(
    status: "running" | "completed",
    sessionEvent: SessionEvent,
    timestampOverride?: Date,
  ): Promise<void> {
    const eventMessage = sessionEvent.message;
    if (!eventMessage?.role) {
      this.logError("cannot persist pi mono message without role", sessionEvent);
      return;
    }

    const messageId = await this.resolveMessageId(sessionEvent);
    const timestamp = this.resolvePersistedTimestamp(
      timestampOverride ?? this.resolveMessageTimestamp(eventMessage.timestamp),
    );
    const companyId = await this.resolveCompanyId();
    const turnId = await this.resolveTurnId(companyId, timestamp);
    const messageRecord = this.buildSessionMessageRecord(
      companyId,
      messageId,
      status,
      eventMessage,
      timestamp,
      turnId,
    );

    await this.transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;

      if (this.persistedMessageIds.has(messageId)) {
        await updatableDatabase
          .update(sessionMessages)
          .set({
            isError: messageRecord.isError,
            status: messageRecord.status,
            toolCallId: messageRecord.toolCallId,
            toolName: messageRecord.toolName,
            turnId: messageRecord.turnId,
            updatedAt: messageRecord.updatedAt,
          })
          .where(eq(sessionMessages.id, messageId));
      } else {
        await insertableDatabase.insert(sessionMessages).values(messageRecord);
        this.persistedMessageIds.add(messageId);
      }
    });

    await this.upsertMessageContents(companyId, messageId, eventMessage, timestamp);
    this.trackMessageIdForTurn(turnId, messageId);
    await this.publishMessageUpdate(messageId);

    if (status === "completed") {
      this.messageIdByEventKey.delete(this.createEventKey(eventMessage));
      this.contentIdsByMessageId.delete(messageId);
      this.persistedMessageIds.delete(messageId);
    }
  }

  private async handleToolExecutionStart(sessionEvent: SessionEvent): Promise<void> {
    this.completedToolExecutionKeys.delete(this.createToolExecutionEventKey(sessionEvent));
    await this.upsertSessionMessage("running", this.createToolExecutionSessionEvent(sessionEvent));
    this.logDebug("pi mono tool execution started", sessionEvent);
  }

  private async handleToolExecutionUpdate(sessionEvent: SessionEvent): Promise<void> {
    await this.upsertSessionMessage("running", this.createToolExecutionSessionEvent(sessionEvent));
    this.logDebug("pi mono tool execution updated", sessionEvent);
  }

  private async handleToolExecutionEnd(sessionEvent: SessionEvent): Promise<void> {
    await this.upsertSessionMessage("completed", this.createToolExecutionSessionEvent(sessionEvent));
    this.completedToolExecutionKeys.add(this.createToolExecutionEventKey(sessionEvent));
    this.logDebug("pi mono tool execution ended", sessionEvent);
  }

  private async upsertMessageContents(
    companyId: string,
    messageId: string,
    message: SessionMessage,
    timestamp: Date,
  ): Promise<void> {
    const contentRecords = this.buildMessageContentRecords(companyId, messageId, message, timestamp);
    await this.transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const trackedContentIds = [...(this.contentIdsByMessageId.get(messageId) ?? [])];

      for (const [contentIndex, contentRecord] of contentRecords.entries()) {
        const existingContentId = trackedContentIds[contentIndex];
        if (existingContentId) {
          await updatableDatabase
            .update(messageContents)
            .set({
              arguments: contentRecord.arguments,
              data: contentRecord.data,
              mimeType: contentRecord.mimeType,
              structuredContent: contentRecord.structuredContent,
              text: contentRecord.text,
              toolCallId: contentRecord.toolCallId,
              toolName: contentRecord.toolName,
              type: contentRecord.type,
              updatedAt: contentRecord.updatedAt,
            })
            .where(eq(messageContents.id, existingContentId));
          continue;
        }

        await insertableDatabase.insert(messageContents).values(contentRecord);
        trackedContentIds.push(String(contentRecord.id));
      }

      const staleContentIds = trackedContentIds.slice(contentRecords.length);
      for (const staleContentId of staleContentIds) {
        await deletableDatabase.delete(messageContents).where(eq(messageContents.id, staleContentId));
      }

      const nextTrackedContentIds = trackedContentIds.slice(0, contentRecords.length);
      if (nextTrackedContentIds.length === 0) {
        this.contentIdsByMessageId.delete(messageId);
        return;
      }

      this.contentIdsByMessageId.set(messageId, nextTrackedContentIds);
    });
  }

  private buildSessionMessageRecord(
    companyId: string,
    messageId: string,
    status: "running" | "completed",
    message: SessionMessage,
    timestamp: Date,
    turnId: string,
  ): Record<string, unknown> {
    return {
      companyId,
      createdAt: timestamp,
      id: messageId,
      isError: this.resolveIsError(message),
      role: message.role,
      sessionId: this.sessionId,
      status,
      toolCallId: this.resolveMessageToolCallId(message),
      toolName: this.resolveMessageToolName(message),
      turnId,
      updatedAt: timestamp,
    };
  }

  private async resolveTurnId(companyId: string, timestamp: Date): Promise<string> {
    if (this.currentTurnId) {
      return this.currentTurnId;
    }

    await this.startPromptTurn(timestamp);
    return this.currentTurnId as string;
  }

  private buildMessageContentRecords(
    companyId: string,
    messageId: string,
    message: SessionMessage,
    timestamp: Date,
  ): Array<Record<string, unknown>> {
    const messageContent = this.resolveMessageContent(message);
    const structuredContent = message.structuredContent?.type === "terminal" ? message.structuredContent : null;

    return messageContent
      .flatMap((contentBlock, contentIndex) => {
        const contentStructuredContent = contentIndex === 0 ? structuredContent : null;
        if (contentBlock.type === "text") {
          return [{
            companyId,
            createdAt: timestamp,
            id: randomUUID(),
            messageId,
            structuredContent: contentStructuredContent,
            text: contentBlock.text,
            type: "text",
            updatedAt: timestamp,
          }];
        }

        if (contentBlock.type === "image") {
          return [{
            companyId,
            createdAt: timestamp,
            data: contentBlock.data,
            id: randomUUID(),
            messageId,
            mimeType: contentBlock.mimeType,
            structuredContent: contentStructuredContent,
            type: "image",
            updatedAt: timestamp,
          }];
        }

        if (contentBlock.type === "thinking") {
          return [{
            companyId,
            createdAt: timestamp,
            id: randomUUID(),
            messageId,
            structuredContent: contentStructuredContent,
            text: contentBlock.thinking,
            type: "thinking",
            updatedAt: timestamp,
          }];
        }

        if (contentBlock.type === "toolCall") {
          return [{
            arguments: contentBlock.arguments,
            companyId,
            createdAt: timestamp,
            id: randomUUID(),
            messageId,
            structuredContent: contentStructuredContent,
            toolCallId: contentBlock.id,
            toolName: contentBlock.name,
            type: "toolCall",
            updatedAt: timestamp,
          }];
        }

        return [];
      });
  }

  private resolveMessageContent(message: SessionMessage): MessageContent[] {
    const normalizedContent = this.normalizeMessageContent(message.content);
    if (message.role !== "assistant") {
      return normalizedContent;
    }
    if (normalizedContent.some((contentBlock) => contentBlock.type === "thinking")) {
      return normalizedContent;
    }
    if (this.persistedThinkingContent.trim().length === 0) {
      return normalizedContent;
    }

    return [
      {
        thinking: this.persistedThinkingContent,
        type: "thinking",
      },
      ...normalizedContent,
    ];
  }

  private normalizeMessageContent(content: SessionMessage["content"]): MessageContent[] {
    if (typeof content === "string") {
      return [{
        text: content,
        type: "text",
      }];
    }

    if (Array.isArray(content)) {
      return content;
    }

    return [];
  }

  private createToolExecutionSessionEvent(sessionEvent: SessionEvent): SessionEvent {
    const payload = sessionEvent.type === "tool_execution_update"
      ? sessionEvent.partialResult
      : sessionEvent.result;
    const content = this.extractToolExecutionContent(payload);
    const structuredContent = this.extractTerminalStructuredContent(payload);

    return {
      message: {
        content,
        isError: sessionEvent.isError === true,
        role: "toolResult",
        structuredContent,
        timestamp: Date.now(),
        toolCallId: sessionEvent.toolCallId,
        toolName: sessionEvent.toolName,
      },
      type: sessionEvent.type,
    };
  }

  private extractToolExecutionContent(value: unknown): string | MessageContent[] {
    const normalizedContentBlocks = this.normalizeToolExecutionContentBlocks(value);
    if (normalizedContentBlocks.length > 0) {
      return normalizedContentBlocks;
    }

    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
      return String(value);
    }
    if (value === null || typeof value === "undefined") {
      return "";
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private normalizeToolExecutionContentBlocks(value: unknown): MessageContent[] {
    const rawContent = this.extractRawToolExecutionContent(value);
    if (!Array.isArray(rawContent)) {
      return [];
    }

    return rawContent.flatMap((contentBlock) => {
      if (!contentBlock || typeof contentBlock !== "object") {
        return [];
      }

      const contentType = "type" in contentBlock ? contentBlock.type : undefined;
      if (contentType === "text" && typeof contentBlock.text === "string") {
        return [{
          text: contentBlock.text,
          type: "text",
        }];
      }
      if (
        contentType === "image"
        && typeof contentBlock.data === "string"
        && typeof contentBlock.mimeType === "string"
      ) {
        return [{
          data: contentBlock.data,
          mimeType: contentBlock.mimeType,
          type: "image",
        }];
      }

      return [];
    });
  }

  private extractRawToolExecutionContent(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value;
    }
    if (!value || typeof value !== "object") {
      return undefined;
    }

    const toolExecutionResult = value as ToolExecutionResult;
    return toolExecutionResult.content;
  }

  private extractTerminalStructuredContent(value: unknown): TerminalStructuredContent | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    const toolExecutionResult = value as ToolExecutionResult;
    const details = toolExecutionResult.details;
    if (!details || typeof details !== "object") {
      return null;
    }

    const terminalDetails = details as Record<string, unknown>;
    if (
      typeof terminalDetails.command !== "string"
      || typeof terminalDetails.completed !== "boolean"
      || typeof terminalDetails.sessionId !== "string"
    ) {
      return null;
    }

    const cwd = typeof terminalDetails.cwd === "string" ? terminalDetails.cwd : null;
    const exitCode = typeof terminalDetails.exitCode === "number" ? terminalDetails.exitCode : null;

    return {
      type: "terminal",
      command: terminalDetails.command,
      completed: terminalDetails.completed,
      cwd,
      exitCode,
      sessionId: terminalDetails.sessionId,
    };
  }

  private async processAssistantThinkingEvent(sessionEvent: SessionEvent): Promise<void> {
    switch (sessionEvent.assistantMessageEvent?.type) {
      case "thinking_start":
        this.isThinking = true;
        this.thinkingText = "";
        this.persistedThinkingContent = "";
        await this.updateThinkingState(true, null);
        return;
      case "thinking_delta": {
        const nextThinkingDelta = String(sessionEvent.assistantMessageEvent.delta ?? "");
        this.isThinking = true;
        this.thinkingText = `${this.thinkingText}${nextThinkingDelta}`;
        this.persistedThinkingContent = this.thinkingText;
        await this.updateThinkingState(
          true,
          this.thinkingText.trim().length > 0 ? this.thinkingText : null,
        );
        return;
      }
      case "thinking_end":
        await this.clearThinkingState(true);
        return;
      default:
        return;
    }
  }

  private async clearThinkingState(
    publishUpdate: boolean,
    includeContextSnapshot = false,
  ): Promise<void> {
    const hadThinkingState = this.isThinking || this.thinkingText.length > 0;
    this.isThinking = false;
    this.thinkingText = "";
    if (!hadThinkingState) {
      if (includeContextSnapshot) {
        await this.persistSessionState({}, publishUpdate, true);
      }
      return;
    }
    await this.updateThinkingState(false, null, publishUpdate, includeContextSnapshot);
  }

  private async updateThinkingState(
    isThinking: boolean,
    thinkingText: string | null,
    publishUpdate = true,
    includeContextSnapshot = false,
  ): Promise<void> {
    await this.persistSessionState({
      isThinking,
      thinkingText,
    }, publishUpdate, includeContextSnapshot);
  }

  private buildContextSnapshotValues(): Record<string, unknown> {
    const contextSnapshot = this.contextSnapshotProvider();
    return {
      currentContextTokens: contextSnapshot.currentContextTokens,
      isCompacting: contextSnapshot.isCompacting,
      maxContextTokens: contextSnapshot.maxContextTokens,
    };
  }

  private async persistSessionState(
    values: Record<string, unknown>,
    publishUpdate: boolean,
    includeContextSnapshot: boolean,
  ): Promise<void> {
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(agentSessions)
        .set({
          ...values,
          ...(includeContextSnapshot ? this.buildContextSnapshotValues() : {}),
          updated_at: new Date(),
        })
        .where(and(
          eq(agentSessions.id, this.sessionId),
          ne(agentSessions.status, "archived"),
        ));
    });

    if (publishUpdate) {
      await this.publishSessionUpdate();
    }
  }

  private resolveIsError(message: SessionMessage): boolean {
    if (message.role === "toolResult") {
      return message.isError === true;
    }

    return message.stopReason === "error" || message.stopReason === "aborted" || typeof message.errorMessage === "string";
  }

  private resolveMessageToolCallId(message: SessionMessage): string | null {
    if (message.role === "toolResult") {
      return message.toolCallId ?? null;
    }

    const [toolCallContent] = this.normalizeMessageContent(message.content).filter((contentBlock) => {
      return contentBlock.type === "toolCall";
    });

    if (toolCallContent?.type === "toolCall") {
      return toolCallContent.id ?? null;
    }

    return null;
  }

  private resolveMessageToolName(message: SessionMessage): string | null {
    if (message.role === "toolResult") {
      return message.toolName ?? null;
    }

    const [toolCallContent] = this.normalizeMessageContent(message.content).filter((contentBlock) => {
      return contentBlock.type === "toolCall";
    });

    if (toolCallContent?.type === "toolCall") {
      return toolCallContent.name ?? null;
    }

    return null;
  }

  private resolveMessageTimestamp(timestamp?: number): Date {
    if (typeof timestamp === "number") {
      return new Date(timestamp);
    }

    return new Date();
  }

  private resolvePersistedTimestamp(timestamp: Date): Date {
    const candidateMilliseconds = timestamp.getTime();
    const nextMilliseconds = candidateMilliseconds > this.lastPersistedTimestampMilliseconds
      ? candidateMilliseconds
      : this.lastPersistedTimestampMilliseconds + 1;
    this.lastPersistedTimestampMilliseconds = nextMilliseconds;
    return new Date(nextMilliseconds);
  }

  private peekQueuedUserMessageDispatch(): QueuedUserMessageDispatch | undefined {
    return this.queuedUserMessageDispatches[0];
  }

  private shiftQueuedUserMessageDispatch(): QueuedUserMessageDispatch | undefined {
    return this.queuedUserMessageDispatches.shift();
  }

  private async markQueuedUserMessageDispatched(sessionEvent: SessionEvent): Promise<void> {
    const queuedUserMessageDispatch = this.peekQueuedUserMessageDispatch();
    if (!queuedUserMessageDispatch || queuedUserMessageDispatch.dispatched || !queuedUserMessageDispatch.queuedMessageId) {
      return;
    }

    const companyId = await this.resolveCompanyId();
    const dispatchedAt = this.resolveMessageTimestamp(sessionEvent.message?.timestamp);
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(sessionQueuedMessages)
        .set({
          // "Dispatched" is the first PI Mono user `message_start` we observe for a claimed queue
          // row. We intentionally stamp it here instead of at `steer()` / `prompt()` call time so
          // cleanup can distinguish "accepted by our worker" from "actually consumed by PI Mono".
          dispatchedAt,
          updatedAt: dispatchedAt,
        })
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          eq(sessionQueuedMessages.id, queuedUserMessageDispatch.queuedMessageId),
          eq(sessionQueuedMessages.status, "processing"),
        ));
    });
    queuedUserMessageDispatch.dispatched = true;
    await this.publishQueuedMessagesUpdate();
  }

  private async deleteQueuedUserMessage(queuedMessageId: string): Promise<void> {
    const companyId = await this.resolveCompanyId();
    await this.transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      await deletableDatabase
        .delete(sessionQueuedMessages)
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          eq(sessionQueuedMessages.id, queuedMessageId),
          eq(sessionQueuedMessages.status, "processing"),
        ));
    });
    await this.publishQueuedMessagesUpdate();
  }

  private async resolveCompanyId(): Promise<string> {
    if (this.companyId) {
      return this.companyId;
    }

    const companyId = await this.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as {
        select(selection: Record<string, unknown>): {
          from(table: unknown): {
            where(condition: unknown): Promise<Array<Record<string, unknown>>>;
          };
        };
      };
      const [sessionRecord] = await selectableDatabase
        .select({
          companyId: agentSessions.companyId,
        })
        .from(agentSessions)
        .where(eq(agentSessions.id, this.sessionId));

      return sessionRecord?.companyId;
    });

    if (typeof companyId !== "string") {
      throw new Error("Session company not found.");
    }

    this.companyId = companyId;
    return companyId;
  }

  private async resolveMessageId(sessionEvent: SessionEvent): Promise<string> {
    const eventMessage = sessionEvent.message;
    if (!eventMessage?.role) {
      throw new Error("Message role is required.");
    }

    const eventKey = this.createEventKey(eventMessage);
    const existingMessageId = this.messageIdByEventKey.get(eventKey);
    if (existingMessageId) {
      return existingMessageId;
    }

    const messageId = randomUUID();
    this.messageIdByEventKey.set(eventKey, messageId);
    return messageId;
  }

  private createEventKey(message: SessionMessage): string {
    if (message.role === "toolResult" && (message.toolCallId || message.toolName)) {
      return [
        message.role,
        message.toolCallId ?? "",
        message.toolName ?? "",
      ].join(":");
    }

    return [
      message.role ?? "unknown",
      typeof message.timestamp === "number" ? String(message.timestamp) : "no-timestamp",
      message.toolCallId ?? "",
      message.toolName ?? "",
    ].join(":");
  }

  private hasTrackedToolExecutionMessage(message?: SessionMessage): boolean {
    if (!message || message.role !== "toolResult" || (!message.toolCallId && !message.toolName)) {
      return false;
    }

    const eventKey = this.createEventKey(message);
    return this.messageIdByEventKey.has(eventKey) || this.completedToolExecutionKeys.has(eventKey);
  }

  private createToolExecutionEventKey(sessionEvent: SessionEvent): string {
    return this.createEventKey({
      role: "toolResult",
      toolCallId: sessionEvent.toolCallId,
      toolName: sessionEvent.toolName,
    });
  }

  private logDebug(logMessage: string, event: SessionEvent): void {
    this.logger.debug({
      event,
      logMessage,
      sessionId: this.sessionId,
    });
  }

  private logError(logMessage: string, event: SessionEvent): void {
    this.logger.error({
      event,
      logMessage,
      sessionId: this.sessionId,
    });
  }

  private async publishMessageUpdate(messageId: string): Promise<void> {
    const companyId = await this.resolveCompanyId();
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(
      this.sessionProcessPubSubNames.getSessionMessageUpdateChannel(this.sessionId, messageId),
    );
  }

  private trackMessageIdForTurn(turnId: string, messageId: string): void {
    const trackedMessageIds = this.messageIdsByTurnId.get(turnId) ?? new Set<string>();
    trackedMessageIds.add(messageId);
    this.messageIdsByTurnId.set(turnId, trackedMessageIds);
  }

  private async publishTurnMessageUpdates(turnId: string): Promise<void> {
    const trackedMessageIds = [...(this.messageIdsByTurnId.get(turnId) ?? [])];
    for (const messageId of trackedMessageIds) {
      await this.publishMessageUpdate(messageId);
    }
  }

  private async publishSessionUpdate(): Promise<void> {
    const companyId = await this.resolveCompanyId();
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionUpdateChannel(this.sessionId));
  }

  private async publishQueuedMessagesUpdate(): Promise<void> {
    const companyId = await this.resolveCompanyId();
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionQueuedMessagesUpdateChannel(this.sessionId));
  }
}
