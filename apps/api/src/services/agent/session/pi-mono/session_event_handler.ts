import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { agentSessions, messageContents, sessionMessages } from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { RedisCompanyScopedService } from "../../../redis/company_scoped_service.ts";
import { RedisService } from "../../../redis/service.ts";
import { SessionProcessPubSubNames } from "../process/pub_sub_names.ts";

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

type SessionMessage = {
  content?: string | MessageContent[];
  errorMessage?: string;
  isError?: boolean;
  role?: string;
  stopReason?: string;
  timestamp?: number;
  toolCallId?: string;
  toolName?: string;
};

type SessionEvent = {
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

/**
 * Owns PI Mono session-event handling for one live session. Its scope is to classify the runtime
 * events emitted by the SDK, keep the persisted session lifecycle aligned with agent execution,
 * and make unsupported event shapes noisy in logs so persistence work can expand deliberately.
 */
export class PiMonoSessionEventHandler {
  private readonly redisService: RedisService;
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly sessionId: string;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly messageIdByEventKey = new Map<string, string>();
  private readonly contentIdsByMessageId = new Map<string, string[]>();
  private readonly persistedMessageIds = new Set<string>();
  private eventChain: Promise<void> = Promise.resolve();
  private companyId?: string;

  constructor(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    redisService: RedisService,
    sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
  ) {
    this.redisService = redisService;
    this.transactionProvider = transactionProvider;
    this.sessionId = sessionId;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
  }

  async handle(event: unknown): Promise<void> {
    const queuedEvent = this.eventChain.then(async () => {
      await this.handleEvent(event);
    });
    this.eventChain = queuedEvent.catch(() => {});
    return queuedEvent;
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
        this.logInfo("pi mono turn started", sessionEvent);
        return;
      case "turn_end":
        this.logInfo("pi mono turn ended", sessionEvent);
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
        this.logInfo("pi mono tool execution started", sessionEvent);
        return;
      case "tool_execution_update":
        this.logInfo("pi mono tool execution updated", sessionEvent);
        return;
      case "tool_execution_end":
        this.logInfo("pi mono tool execution ended", sessionEvent);
        return;
      default:
        this.logError("unhandled pi mono session event", sessionEvent);
    }
  }

  private async updateSessionStatus(status: "running" | "stopped"): Promise<void> {
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(agentSessions)
        .set({
          status,
          updated_at: new Date(),
        })
        .where(eq(agentSessions.id, this.sessionId));
    });

    await this.publishSessionUpdate();
  }

  private async handleAgentStart(sessionEvent: SessionEvent): Promise<void> {
    this.logInfo("pi mono agent started", sessionEvent);
    await this.updateSessionStatus("running");
  }

  private async handleAgentEnd(sessionEvent: SessionEvent): Promise<void> {
    this.logInfo("pi mono agent ended", sessionEvent);
    await this.updateSessionStatus("stopped");
  }

  private async handleMessageStart(sessionEvent: SessionEvent): Promise<void> {
    switch (sessionEvent.message?.role) {
      case "user":
        this.logInfo("ignoring pi mono user message start", sessionEvent);
        return;
      case "assistant":
        await this.upsertSessionMessage("running", sessionEvent);
        this.logInfo("pi mono assistant message started", sessionEvent);
        return;
      case "toolResult":
        await this.upsertSessionMessage("running", sessionEvent);
        this.logInfo("pi mono tool result message started", sessionEvent);
        return;
      default:
        this.logError("unhandled pi mono message_start event", sessionEvent);
    }
  }

  private async handleMessageUpdate(sessionEvent: SessionEvent): Promise<void> {
    if (sessionEvent.message?.role === "assistant") {
      await this.upsertSessionMessage("running", sessionEvent);
      this.logInfo("pi mono assistant message updated", sessionEvent);
      return;
    }

    this.logError("unhandled pi mono message_update event", sessionEvent);
  }

  private async handleMessageEnd(sessionEvent: SessionEvent): Promise<void> {
    switch (sessionEvent.message?.role) {
      case "user":
        await this.upsertSessionMessage("completed", sessionEvent);
        this.logInfo("pi mono user message completed", sessionEvent);
        return;
      case "assistant":
        await this.upsertSessionMessage("completed", sessionEvent);
        this.logInfo("pi mono assistant message completed", sessionEvent);
        return;
      case "toolResult":
        await this.upsertSessionMessage("completed", sessionEvent);
        this.logInfo("pi mono tool result message completed", sessionEvent);
        return;
      default:
        this.logError("unhandled pi mono message_end event", sessionEvent);
    }
  }

  private async upsertSessionMessage(
    status: "running" | "completed",
    sessionEvent: SessionEvent,
  ): Promise<void> {
    const eventMessage = sessionEvent.message;
    if (!eventMessage?.role) {
      this.logError("cannot persist pi mono message without role", sessionEvent);
      return;
    }

    const messageId = await this.resolveMessageId(sessionEvent);
    const timestamp = this.resolveMessageTimestamp(eventMessage.timestamp);
    const companyId = await this.resolveCompanyId();
    const messageRecord = this.buildSessionMessageRecord(
      companyId,
      messageId,
      status,
      eventMessage,
      timestamp,
    );

    await this.transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;

      if (this.persistedMessageIds.has(messageId)) {
        await updatableDatabase
          .update(sessionMessages)
          .set({
            isError: messageRecord.isError,
            isThinking: messageRecord.isThinking,
            thinkingText: messageRecord.thinkingText,
            status: messageRecord.status,
            toolCallId: messageRecord.toolCallId,
            toolName: messageRecord.toolName,
            updatedAt: messageRecord.updatedAt,
          })
          .where(eq(sessionMessages.id, messageId));
      } else {
        await insertableDatabase.insert(sessionMessages).values(messageRecord);
        this.persistedMessageIds.add(messageId);
      }
    });

    await this.upsertMessageContents(companyId, messageId, eventMessage, timestamp);
    await this.publishMessageUpdate(messageId);

    if (status === "completed") {
      this.messageIdByEventKey.delete(this.createEventKey(eventMessage));
      this.contentIdsByMessageId.delete(messageId);
      this.persistedMessageIds.delete(messageId);
    }
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
  ): Record<string, unknown> {
    const thinkingText = this.extractThinkingText(message);

    return {
      companyId,
      createdAt: timestamp,
      id: messageId,
      isError: this.resolveIsError(message),
      isThinking: thinkingText.length > 0,
      role: message.role,
      sessionId: this.sessionId,
      status,
      thinkingText: thinkingText.length > 0 ? thinkingText : null,
      toolCallId: this.resolveMessageToolCallId(message),
      toolName: this.resolveMessageToolName(message),
      updatedAt: timestamp,
    };
  }

  private buildMessageContentRecords(
    companyId: string,
    messageId: string,
    message: SessionMessage,
    timestamp: Date,
  ): Array<Record<string, unknown>> {
    const messageContent = this.normalizeMessageContent(message.content);

    return messageContent
      .flatMap((contentBlock) => {
        if (contentBlock.type === "text") {
          return [{
            companyId,
            createdAt: timestamp,
            id: randomUUID(),
            messageId,
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
            type: "image",
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
            toolCallId: contentBlock.id,
            toolName: contentBlock.name,
            type: "toolCall",
            updatedAt: timestamp,
          }];
        }

        return [];
      });
  }

  private extractThinkingText(message: SessionMessage): string {
    return this.normalizeMessageContent(message.content)
      .flatMap((contentBlock) => {
        if (contentBlock.type !== "thinking") {
          return [];
        }

        return [contentBlock.thinking ?? ""];
      })
      .join("\n");
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
    return [
      message.role ?? "unknown",
      typeof message.timestamp === "number" ? String(message.timestamp) : "no-timestamp",
      message.toolCallId ?? "",
      message.toolName ?? "",
    ].join(":");
  }

  private logInfo(logMessage: string, event: SessionEvent): void {
    console.info({
      event,
      logMessage,
      sessionId: this.sessionId,
    });
  }

  private logError(logMessage: string, event: SessionEvent): void {
    console.error({
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

  private async publishSessionUpdate(): Promise<void> {
    const companyId = await this.resolveCompanyId();
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionUpdateChannel(this.sessionId));
  }
}
