import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import pino, { type Logger as PinoLogger } from "pino";
import {
  agentSessions,
  messageContents,
  modelProviderCredentialModels,
  modelProviderCredentials,
  sessionMessages,
  sessionQueuedMessages,
  sessionTurns,
} from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { RedisCompanyScopedService } from "../../../redis/company_scoped_service.ts";
import { RedisService } from "../../../redis/service.ts";
import { CodexRateLimitService } from "../../../ai_providers/codex_rate_limit_service.ts";
import {
  SessionTurnUsageService,
  type SessionTurnUsagePayload,
} from "../session_turn_usage_service.ts";
import { SessionProcessPubSubNames } from "../process/pub_sub_names.ts";
import { UserSessionReadService } from "../user_session_read_service.ts";
import { EnhancedLoggingService } from "../../../../log/enhanced_logging_service.ts";
import { PiMonoProviderErrorAdapterRegistry } from "./errors/adapter_registry.ts";
import { SessionPipelineLogger } from "../../../../log/session_pipeline_logger.ts";

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
  type: "text";
  text: string;
};

type ImageContent = {
  type: "image";
  data: string;
  mimeType: string;
};

type ThinkingContent = {
  type: "thinking";
  thinking: string;
};

type ToolCallContent = {
  type: "toolCall";
  arguments: unknown;
  id: string;
  name: string;
};

type MessageContent = TextContent | ImageContent | ThinkingContent | ToolCallContent;

type ToolExecutionResult = {
  content?: unknown;
  details?: unknown;
};

type TerminalStructuredContent = {
  type: "pty" | "terminal";
  command: string;
  completed: boolean;
  cwd: string | null;
  exitCode: number | null;
  pty_id?: string | null;
  sessionId?: string | null;
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
  usage?: SessionTurnUsagePayload;
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

type CompactionLifecycleRecord = {
  contentId: string;
  messageId: string;
  turnId: string;
  trigger: "automatic" | "manual";
};

type PersistedCompactionMessageRecord = {
  contentId: string;
  messageId: string;
  trigger: "automatic" | "manual";
  turnId: string;
};

type PiMonoSessionContextSnapshot = {
  currentContextTokens: number | null;
  isCompacting: boolean;
  maxContextTokens: number | null;
};

type QueuedUserMessageDispatch = {
  dispatched: boolean;
  queuedMessageId: string | null;
  principalAgentId: string | null;
  principalSessionId: string | null;
  principalType: "agent_message" | "github_webhook" | "task" | "user" | "workflow";
  taskRunId: string | null;
  timestamp: Date;
  workflowRunId: string | null;
};

type SessionAttribution = {
  agentId: string;
  apiKey: string | null;
  baseUrl: string | null;
  companyId: string;
  modelProviderCredentialId: string;
  modelProvider: string | null;
};

type PersistedSessionMessageReference = {
  companyId: string;
  messageId: string;
  timestamp: Date;
  turnId: string;
};

type PiMonoSessionEventHandlerDependencies = {
  contextMessagesSnapshotProvider?: () => unknown;
  contextSnapshotProvider?: () => PiMonoSessionContextSnapshot;
  initialContextMessagesSnapshotAt?: Date | null;
  logger?: PinoLogger | SessionPipelineLogger;
  codexRateLimitService?: CodexRateLimitService;
  sessionProcessPubSubNames?: SessionProcessPubSubNames;
  sessionTurnUsageService?: SessionTurnUsageService;
  userSessionReadService?: UserSessionReadService;
  enhancedLoggingService?: EnhancedLoggingService;
  providerErrorAdapterRegistry?: PiMonoProviderErrorAdapterRegistry;
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
  private static readonly contextMessagesSnapshotIntervalMilliseconds = 60_000;

  private readonly redisService: RedisService;
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly sessionId: string;
  private readonly logger: SessionPipelineLogger;
  private readonly codexRateLimitService: CodexRateLimitService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly sessionTurnUsageService: SessionTurnUsageService;
  private readonly userSessionReadService: UserSessionReadService;
  private readonly enhancedLoggingService: EnhancedLoggingService;
  private readonly providerErrorAdapterRegistry: PiMonoProviderErrorAdapterRegistry;
  private readonly contextMessagesSnapshotProvider: () => unknown;
  private readonly contextSnapshotProvider: () => PiMonoSessionContextSnapshot;
  private readonly messageIdByEventKey = new Map<string, string>();
  private readonly messageIdsByTurnId = new Map<string, Set<string>>();
  private readonly contentIdsByMessageId = new Map<string, string[]>();
  private readonly persistedMessageIds = new Set<string>();
  private readonly queuedUserMessageDispatches: QueuedUserMessageDispatch[] = [];
  private readonly completedToolExecutionKeys = new Set<string>();
  private activeCompactionLifecycle: CompactionLifecycleRecord | null = null;
  private eventChain: Promise<void> = Promise.resolve();
  private companyId?: string;
  private agentId?: string;
  private modelProviderCredentialApiKey?: string;
  private modelProviderCredentialBaseUrl?: string | null;
  private modelProviderCredentialId?: string;
  private modelProviderCredentialProvider?: string;
  private currentTurnId: string | null = null;
  private isThinking = false;
  private thinkingText = "";
  private persistedThinkingContent = "";
  private lastPersistedTimestampMilliseconds = 0;
  private lastContextMessagesSnapshotAtMilliseconds: number | null;

  constructor(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    redisService: RedisService,
    dependencies: PiMonoSessionEventHandlerDependencies = {},
  ) {
    this.redisService = redisService;
    this.transactionProvider = transactionProvider;
    this.sessionId = sessionId;
    const dependencyLogger = dependencies.logger instanceof SessionPipelineLogger
      ? dependencies.logger
      : new SessionPipelineLogger(dependencies.logger ?? PiMonoSessionEventHandler.fallbackLogger);
    this.logger = dependencyLogger.child({
      component: "pi_mono_session_event_handler",
      session_id: sessionId,
    });
    this.contextMessagesSnapshotProvider = dependencies.contextMessagesSnapshotProvider ?? (() => []);
    this.contextSnapshotProvider = dependencies.contextSnapshotProvider ?? (() => ({
      currentContextTokens: null,
      isCompacting: false,
      maxContextTokens: null,
    }));
    this.lastContextMessagesSnapshotAtMilliseconds = dependencies.initialContextMessagesSnapshotAt?.getTime() ?? null;
    this.codexRateLimitService = dependencies.codexRateLimitService ?? new CodexRateLimitService();
    this.sessionProcessPubSubNames = dependencies.sessionProcessPubSubNames ?? new SessionProcessPubSubNames();
    this.sessionTurnUsageService = dependencies.sessionTurnUsageService ?? new SessionTurnUsageService();
    this.userSessionReadService = dependencies.userSessionReadService ?? new UserSessionReadService();
    this.enhancedLoggingService = dependencies.enhancedLoggingService ?? new EnhancedLoggingService();
    this.providerErrorAdapterRegistry = dependencies.providerErrorAdapterRegistry
      ?? new PiMonoProviderErrorAdapterRegistry();
  }

  async handle(event: unknown): Promise<void> {
    const queuedEvent = this.eventChain.then(async () => {
      await this.handleEvent(event);
    });
    this.eventChain = queuedEvent.catch(() => {});
    return queuedEvent;
  }

  queueUserMessageTimestamp(
    timestamp: Date,
    queuedMessageId?: string | null,
    principalMetadata?: {
      principalAgentId: string | null;
      principalSessionId: string | null;
      principalType: "agent_message" | "github_webhook" | "task" | "user" | "workflow";
      taskRunId: string | null;
      workflowRunId: string | null;
    },
  ): void {
    this.queuedUserMessageDispatches.push({
      dispatched: false,
      queuedMessageId: queuedMessageId ? String(queuedMessageId).trim() : null,
      principalAgentId: principalMetadata?.principalAgentId ?? null,
      principalSessionId: principalMetadata?.principalSessionId ?? null,
      principalType: principalMetadata?.principalType ?? "user",
      taskRunId: principalMetadata?.taskRunId ?? null,
      timestamp,
      workflowRunId: principalMetadata?.workflowRunId ?? null,
    });
  }

  async startPromptTurn(startedAt: Date = new Date()): Promise<string> {
    if (this.currentTurnId) {
      return this.currentTurnId;
    }

    const companyId = await this.resolveCompanyId();
    const turnId = randomUUID();
    await this.transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as unknown as InsertableDatabase;
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

  async finishPromptTurn(endedAt: Date = new Date()): Promise<string | null> {
    const currentTurnId = this.currentTurnId;
    if (!currentTurnId) {
      return null;
    }

    await this.waitForIdle();
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as unknown as UpdatableDatabase;
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
    return currentTurnId;
  }

  async recordInterruptedAssistantUsage(message: unknown, recordedAt: Date = new Date()): Promise<void> {
    await this.waitForIdle();
    const sessionMessage = message as SessionMessage | undefined;
    if (sessionMessage?.role !== "assistant" || !sessionMessage.usage) {
      return;
    }

    const attribution = await this.resolveSessionAttribution();
    const turnId = await this.resolveTurnId(attribution.companyId, recordedAt);
    await this.sessionTurnUsageService.recordUsage(this.transactionProvider, {
      agentId: attribution.agentId,
      companyId: attribution.companyId,
      modelProviderCredentialId: attribution.modelProviderCredentialId,
      recordedAt,
      sessionId: this.sessionId,
      turnId,
      usage: sessionMessage.usage,
    });
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
        this.logDebug("pi mono turn started", sessionEvent, {
          event: "pi_mono_turn_started",
        });
        return;
      case "turn_end":
        this.logDebug("pi mono turn ended", sessionEvent, {
          event: "pi_mono_turn_ended",
        });
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
      case "compaction_start":
      case "auto_compaction_start":
        await this.handleCompactionStart(sessionEvent);
        return;
      case "compaction_end":
      case "auto_compaction_end":
        await this.handleCompactionEnd(sessionEvent);
        return;
      case "queue_update":
        this.logDebug("pi mono queue updated", sessionEvent, {
          event: "pi_mono_queue_updated",
        });
        return;
      case "session_info_changed":
        this.logDebug("pi mono session info changed", sessionEvent, {
          event: "pi_mono_session_info_changed",
        });
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
    this.logDebug("pi mono agent started", sessionEvent, {
      event: "pi_mono_agent_started",
      status_to: "running",
    });
    await this.completePersistedRunningCompactionMessages(this.resolvePersistedTimestamp(new Date()));
    await this.updateSessionStatus("running");
  }

  private async handleAgentEnd(sessionEvent: SessionEvent): Promise<void> {
    this.logDebug("pi mono agent ended", sessionEvent, {
      event: "pi_mono_agent_ended",
      status_from: "running",
      status_to: "stopped",
    });
    const companyId = await this.resolveCompanyId();
    const clearReadsStartedAtMilliseconds = Date.now();
    await this.userSessionReadService.clearSessionReads(this.transactionProvider, {
      companyId,
      sessionId: this.sessionId,
    });
    this.logEnhanced(companyId, "session_agent_end", "session_agent_end_clear_reads_end", {
      durationMs: Date.now() - clearReadsStartedAtMilliseconds,
    });
    const persistContextStartedAtMilliseconds = Date.now();
    await this.persistContextMessagesSnapshot(new Date(), true);
    this.logEnhanced(companyId, "session_agent_end", "session_agent_end_persist_context_end", {
      durationMs: Date.now() - persistContextStartedAtMilliseconds,
    });
    const updateStatusStartedAtMilliseconds = Date.now();
    await this.updateSessionStatus("stopped");
    this.logEnhanced(companyId, "session_agent_end", "session_agent_end_update_status_end", {
      durationMs: Date.now() - updateStatusStartedAtMilliseconds,
    });
  }

  private async handleCompactionStart(sessionEvent: SessionEvent): Promise<void> {
    this.logDebug("pi mono compaction started", sessionEvent, {
      event: "pi_mono_compaction_started",
    });
    await this.persistCompactionStartMessage(sessionEvent);
    await this.persistSessionState({}, true, true);
  }

  private async handleCompactionEnd(sessionEvent: SessionEvent): Promise<void> {
    this.logDebug("pi mono compaction ended", sessionEvent, {
      event: "pi_mono_compaction_ended",
    });
    await this.persistCompactionEndMessage();
    await this.persistSessionState({}, true, true);
  }

  private async persistCompactionStartMessage(sessionEvent: SessionEvent): Promise<void> {
    if (this.activeCompactionLifecycle) {
      return;
    }

    const companyId = await this.resolveCompanyId();
    const timestamp = this.resolvePersistedTimestamp(new Date());
    await this.completePersistedRunningCompactionMessages(timestamp);
    const turnId = randomUUID();
    const messageId = randomUUID();
    const trigger = this.resolveCompactionTrigger(sessionEvent);

    await this.insertSyntheticTurn({
      companyId,
      endedAt: null,
      startedAt: timestamp,
      turnId,
    });
    const syntheticMessage = await this.insertSyntheticAssistantMessage({
      companyId,
      messageId,
      status: "running",
      structuredContent: {
        trigger,
        type: "compaction",
      },
      text: "Compacting…",
      timestamp,
      turnId,
    });

    this.activeCompactionLifecycle = {
      contentId: syntheticMessage.contentId,
      messageId,
      turnId,
      trigger,
    };
  }

  private async persistCompactionEndMessage(): Promise<void> {
    const timestamp = this.resolvePersistedTimestamp(new Date());
    if (this.activeCompactionLifecycle) {
      await this.completeSyntheticTurn(this.activeCompactionLifecycle.turnId, timestamp);
      await this.updateSyntheticAssistantCompactionMessage({
        contentId: this.activeCompactionLifecycle.contentId,
        messageId: this.activeCompactionLifecycle.messageId,
        status: "completed",
        structuredContent: {
          trigger: this.activeCompactionLifecycle.trigger,
          type: "compaction",
        },
        text: "Compaction complete",
        updatedAt: timestamp,
      });
      const staleMessages = (await this.loadPersistedRunningCompactionMessages()).filter((runningMessage) => {
        return runningMessage.messageId !== this.activeCompactionLifecycle?.messageId;
      });
      await this.completePersistedCompactionMessages(staleMessages, timestamp);
    } else {
      await this.completePersistedRunningCompactionMessages(timestamp);
    }
    this.activeCompactionLifecycle = null;
  }

  private resolveCompactionTrigger(sessionEvent: SessionEvent): "automatic" | "manual" {
    return sessionEvent.type?.startsWith("auto_") ? "automatic" : "manual";
  }

  private async completePersistedRunningCompactionMessages(timestamp: Date): Promise<void> {
    const runningMessages = await this.loadPersistedRunningCompactionMessages();
    await this.completePersistedCompactionMessages(runningMessages, timestamp);
  }

  private async completePersistedCompactionMessages(
    runningMessages: ReadonlyArray<PersistedCompactionMessageRecord>,
    timestamp: Date,
  ): Promise<void> {
    if (runningMessages.length === 0) {
      return;
    }

    for (const runningMessage of runningMessages) {
      await this.completeSyntheticTurn(runningMessage.turnId, timestamp);
      await this.updateSyntheticAssistantCompactionMessage({
        contentId: runningMessage.contentId,
        messageId: runningMessage.messageId,
        status: "completed",
        structuredContent: {
          trigger: runningMessage.trigger,
          type: "compaction",
        },
        text: "Compaction complete",
        updatedAt: timestamp,
      });
    }

  }

  private async loadPersistedRunningCompactionMessages(): Promise<PersistedCompactionMessageRecord[]> {
    const persistedMessages = await this.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as {
        select(selection: Record<string, unknown>): {
          from(table: unknown): {
            where(condition: unknown): Promise<Array<Record<string, unknown>>>;
          };
        };
      };
      const sessionMessageRows = await selectableDatabase
        .select({
          id: sessionMessages.id,
          role: sessionMessages.role,
          sessionId: sessionMessages.sessionId,
          status: sessionMessages.status,
          turnId: sessionMessages.turnId,
        })
        .from(sessionMessages)
        .where(eq(sessionMessages.sessionId, this.sessionId));

      const runningCompactionMessages: PersistedCompactionMessageRecord[] = [];
      for (const sessionMessageRow of sessionMessageRows) {
        if (
          sessionMessageRow?.sessionId !== this.sessionId
          || sessionMessageRow?.role !== "assistant"
          || sessionMessageRow?.status !== "running"
          || typeof sessionMessageRow?.id !== "string"
          || typeof sessionMessageRow?.turnId !== "string"
        ) {
          continue;
        }

        const contentRows = await selectableDatabase
          .select({
            id: messageContents.id,
            messageId: messageContents.messageId,
            structuredContent: messageContents.structuredContent,
          })
          .from(messageContents)
          .where(eq(messageContents.messageId, sessionMessageRow.id));
        const compactionContentRow = contentRows.find((contentRow) => {
          if (contentRow?.messageId !== sessionMessageRow.id || typeof contentRow?.id !== "string") {
            return false;
          }

          const structuredContent = contentRow.structuredContent as Record<string, unknown> | null;
          return structuredContent?.type === "compaction";
        });
        if (!compactionContentRow || typeof compactionContentRow.id !== "string") {
          continue;
        }

        const structuredContent = compactionContentRow.structuredContent as Record<string, unknown> | null;
        runningCompactionMessages.push({
          contentId: compactionContentRow.id,
          messageId: sessionMessageRow.id,
          trigger: structuredContent?.trigger === "automatic" ? "automatic" : "manual",
          turnId: sessionMessageRow.turnId,
        });
      }

      return runningCompactionMessages;
    });

    return persistedMessages;
  }

  private async insertSyntheticTurn(input: {
    companyId: string;
    endedAt: Date | null;
    startedAt: Date;
    turnId: string;
  }): Promise<void> {
    await this.transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as unknown as InsertableDatabase;
      await insertableDatabase.insert(sessionTurns).values({
        companyId: input.companyId,
        endedAt: input.endedAt,
        id: input.turnId,
        sessionId: this.sessionId,
        startedAt: input.startedAt,
      });
    });
  }

  private async completeSyntheticTurn(turnId: string, endedAt: Date): Promise<void> {
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      await updatableDatabase
        .update(sessionTurns)
        .set({
          endedAt,
        })
        .where(eq(sessionTurns.id, turnId));
    });
  }

  private async insertSyntheticAssistantMessage(input: {
    companyId: string;
    messageId: string;
    status: "running" | "completed";
    structuredContent: Record<string, unknown>;
    text: string;
    timestamp: Date;
    turnId: string;
  }): Promise<{ contentId: string }> {
    const contentId = randomUUID();
    await this.transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as unknown as InsertableDatabase;
      await insertableDatabase.insert(sessionMessages).values({
        companyId: input.companyId,
        createdAt: input.timestamp,
        errorMessage: null,
        id: input.messageId,
        isError: false,
        principalAgentId: null,
        principalSessionId: null,
        principalType: "user",
        role: "assistant",
        sessionId: this.sessionId,
        status: input.status,
        taskRunId: null,
        toolCallId: null,
        toolName: null,
        turnId: input.turnId,
        updatedAt: input.timestamp,
        workflowRunId: null,
      });
      await insertableDatabase.insert(messageContents).values({
        companyId: input.companyId,
        createdAt: input.timestamp,
        id: contentId,
        messageId: input.messageId,
        structuredContent: input.structuredContent,
        text: input.text,
        type: "text",
        updatedAt: input.timestamp,
      });
    });

    await this.publishMessageUpdate(input.messageId);
    return {
      contentId,
    };
  }

  private async updateSyntheticAssistantCompactionMessage(input: {
    contentId: string;
    messageId: string;
    status: "running" | "completed";
    structuredContent: Record<string, unknown>;
    text: string;
    updatedAt: Date;
  }): Promise<void> {
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      await updatableDatabase
        .update(sessionMessages)
        .set({
          status: input.status,
          updatedAt: input.updatedAt,
        })
        .where(eq(sessionMessages.id, input.messageId));
      await updatableDatabase
        .update(messageContents)
        .set({
          structuredContent: input.structuredContent,
          text: input.text,
          updatedAt: input.updatedAt,
        })
        .where(eq(messageContents.id, input.contentId));
    });

    await this.publishMessageUpdate(input.messageId);
  }

  private async handleMessageStart(sessionEvent: SessionEvent): Promise<void> {
    switch (sessionEvent.message?.role) {
      case "user":
        await this.markQueuedUserMessageDispatched(sessionEvent);
        this.logDebug("ignoring pi mono user message start", sessionEvent, {
          event: "pi_mono_user_message_start_ignored",
        });
        return;
      case "assistant":
        this.persistedThinkingContent = "";
        this.logDebug(
          "pi mono assistant message started",
          sessionEvent,
          {
            event: "pi_mono_assistant_message_started",
            status_to: "running",
          },
          await this.upsertSessionMessage("running", sessionEvent),
        );
        return;
      case "toolResult":
      if (this.hasTrackedToolExecutionMessage(sessionEvent.message)) {
        this.logDebug("ignoring pi mono tool result start after tool execution events", sessionEvent, {
          event: "pi_mono_tool_result_start_ignored",
        });
        return;
      }
        this.logDebug(
          "pi mono tool result message started",
          sessionEvent,
          {
            event: "pi_mono_tool_result_message_started",
            status_to: "running",
          },
          await this.upsertSessionMessage("running", sessionEvent),
        );
        return;
      default:
        this.logError("unhandled pi mono message_start event", sessionEvent);
    }
  }

  private async handleMessageUpdate(sessionEvent: SessionEvent): Promise<void> {
    if (sessionEvent.message?.role === "assistant") {
      await this.processAssistantThinkingEvent(sessionEvent);
      this.logDebug(
        "pi mono assistant message updated",
        sessionEvent,
        {
          event: "pi_mono_assistant_message_updated",
          status_to: "running",
        },
        await this.upsertSessionMessage("running", sessionEvent),
      );
      return;
    }

    this.logError("unhandled pi mono message_update event", sessionEvent);
  }

  private async handleMessageEnd(sessionEvent: SessionEvent): Promise<void> {
    const snapshotTimestamp = this.resolveMessageTimestamp(sessionEvent.message?.timestamp);
    switch (sessionEvent.message?.role) {
      case "user": {
        const queuedUserMessageDispatch = this.shiftQueuedUserMessageDispatch();
        const userMessageTimestamp = queuedUserMessageDispatch?.timestamp
          ?? this.resolveMessageTimestamp(sessionEvent.message.timestamp);
        const persistedMessageReference = await this.upsertSessionMessage(
          "completed",
          sessionEvent,
          userMessageTimestamp,
          queuedUserMessageDispatch,
        );
        if (queuedUserMessageDispatch?.queuedMessageId) {
          await this.deleteQueuedUserMessage(queuedUserMessageDispatch.queuedMessageId);
        }
        await this.persistContextMessagesSnapshot(snapshotTimestamp, false);
        this.logDebug("pi mono user message completed", sessionEvent, {
          event: "pi_mono_user_message_completed",
          status_from: "running",
          status_to: "completed",
        }, persistedMessageReference);
        return;
      }
      case "assistant": {
        const persistedMessageReference = await this.upsertSessionMessage("completed", sessionEvent);
        if (persistedMessageReference && sessionEvent.message) {
          await this.recordAssistantUsage(sessionEvent.message, persistedMessageReference);
          await this.refreshCodexRateLimitsAfterAssistantMessage(persistedMessageReference);
        }
        await this.clearThinkingState(true, true);
        await this.persistContextMessagesSnapshot(snapshotTimestamp, false);
        this.persistedThinkingContent = "";
        this.logDebug("pi mono assistant message completed", sessionEvent, {
          event: "pi_mono_assistant_message_completed",
          status_from: "running",
          status_to: "completed",
        }, persistedMessageReference);
        return;
      }
      case "toolResult": {
        if (this.hasTrackedToolExecutionMessage(sessionEvent.message)) {
          this.logDebug("ignoring pi mono tool result end after tool execution events", sessionEvent, {
            event: "pi_mono_tool_result_end_ignored",
          });
          return;
        }
        const persistedMessageReference = await this.upsertSessionMessage("completed", sessionEvent);
        await this.persistContextMessagesSnapshot(snapshotTimestamp, false);
        this.logDebug("pi mono tool result message completed", sessionEvent, {
          event: "pi_mono_tool_result_message_completed",
          status_from: "running",
          status_to: "completed",
        }, persistedMessageReference);
        return;
      }
      default:
        this.logError("unhandled pi mono message_end event", sessionEvent);
    }
  }

  private async upsertSessionMessage(
    status: "running" | "completed",
    sessionEvent: SessionEvent,
    timestampOverride?: Date,
    principalMetadata?: Pick<QueuedUserMessageDispatch, "principalAgentId" | "principalSessionId" | "principalType" | "taskRunId" | "workflowRunId">,
  ): Promise<PersistedSessionMessageReference | null> {
    const eventMessage = sessionEvent.message;
    if (!eventMessage?.role) {
      this.logError("cannot persist pi mono message without role", sessionEvent);
      return null;
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
      principalMetadata,
    );

    await this.transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as unknown as InsertableDatabase;
      const updatableDatabase = tx as unknown as UpdatableDatabase;

      if (this.persistedMessageIds.has(messageId)) {
        await updatableDatabase
          .update(sessionMessages)
          .set({
            errorMessage: messageRecord.errorMessage,
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

      if (eventMessage.role === "user") {
        await updatableDatabase
          .update(agentSessions)
          .set({
            lastUserMessageAt: timestamp,
          })
          .where(eq(agentSessions.id, this.sessionId));
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

    return {
      companyId,
      messageId,
      timestamp,
      turnId,
    };
  }

  private async recordAssistantUsage(
    message: SessionMessage,
    persistedMessageReference: PersistedSessionMessageReference,
  ): Promise<void> {
    if (!message.usage) {
      return;
    }

    const attribution = await this.resolveSessionAttribution();
    await this.sessionTurnUsageService.recordUsage(this.transactionProvider, {
      agentId: attribution.agentId,
      companyId: persistedMessageReference.companyId,
      modelProviderCredentialId: attribution.modelProviderCredentialId,
      recordedAt: persistedMessageReference.timestamp,
      sessionId: this.sessionId,
      turnId: persistedMessageReference.turnId,
      usage: message.usage,
    });
  }

  private async refreshCodexRateLimitsAfterAssistantMessage(
    persistedMessageReference: PersistedSessionMessageReference,
  ): Promise<void> {
    try {
      const attribution = await this.resolveSessionAttribution();
      if (attribution.modelProvider !== "openai-codex" || !attribution.apiKey) {
        return;
      }

      await this.codexRateLimitService.refreshCredentialLimits(this.transactionProvider, {
        apiKey: attribution.apiKey,
        baseUrl: attribution.baseUrl,
        companyId: attribution.companyId,
        credentialId: attribution.modelProviderCredentialId,
        modelProvider: attribution.modelProvider,
      }, persistedMessageReference.timestamp);
    } catch (error: unknown) {
      this.logger.error({
        event: "session_codex_rate_limit_refresh_failed",
        error,
        logMessage: "failed to refresh codex rate limits after assistant message",
        message_id: persistedMessageReference.messageId,
        turn_id: persistedMessageReference.turnId,
      });
    }
  }

  private async handleToolExecutionStart(sessionEvent: SessionEvent): Promise<void> {
    this.completedToolExecutionKeys.delete(this.createToolExecutionEventKey(sessionEvent));
    this.logDebug(
      "pi mono tool execution started",
      sessionEvent,
      {
        event: "pi_mono_tool_execution_started",
        status_to: "running",
      },
      await this.upsertSessionMessage("running", this.createToolExecutionSessionEvent(sessionEvent)),
    );
  }

  private async handleToolExecutionUpdate(sessionEvent: SessionEvent): Promise<void> {
    this.logDebug(
      "pi mono tool execution updated",
      sessionEvent,
      {
        event: "pi_mono_tool_execution_updated",
        status_to: "running",
      },
      await this.upsertSessionMessage("running", this.createToolExecutionSessionEvent(sessionEvent)),
    );
  }

  private async handleToolExecutionEnd(sessionEvent: SessionEvent): Promise<void> {
    const persistedMessageReference = await this.upsertSessionMessage("completed", this.createToolExecutionSessionEvent(sessionEvent));
    this.completedToolExecutionKeys.add(this.createToolExecutionEventKey(sessionEvent));
    this.logDebug("pi mono tool execution ended", sessionEvent, {
      event: "pi_mono_tool_execution_completed",
      status_from: "running",
      status_to: "completed",
    }, persistedMessageReference);
  }

  private async upsertMessageContents(
    companyId: string,
    messageId: string,
    message: SessionMessage,
    timestamp: Date,
  ): Promise<void> {
    const contentRecords = this.buildMessageContentRecords(companyId, messageId, message, timestamp);
    await this.transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as unknown as InsertableDatabase;
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      const deletableDatabase = tx as unknown as DeletableDatabase;
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
    principalMetadata?: Pick<QueuedUserMessageDispatch, "principalAgentId" | "principalSessionId" | "principalType" | "taskRunId" | "workflowRunId">,
  ): Record<string, unknown> {
    return {
      companyId,
      createdAt: timestamp,
      errorMessage: this.resolveMessageErrorMessage(message),
      id: messageId,
      isError: this.resolveIsError(message),
      principalAgentId: principalMetadata?.principalAgentId ?? null,
      principalSessionId: principalMetadata?.principalSessionId ?? null,
      principalType: principalMetadata?.principalType ?? "user",
      role: message.role,
      sessionId: this.sessionId,
      status,
      taskRunId: principalMetadata?.taskRunId ?? null,
      toolCallId: this.resolveMessageToolCallId(message),
      toolName: this.resolveMessageToolName(message),
      turnId,
      updatedAt: timestamp,
      workflowRunId: principalMetadata?.workflowRunId ?? null,
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
    const structuredContent = message.structuredContent
      && (message.structuredContent.type === "terminal" || message.structuredContent.type === "pty")
      ? message.structuredContent
      : null;

    return messageContent
      .flatMap<Record<string, unknown>>((contentBlock, contentIndex) => {
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

    return rawContent.flatMap<MessageContent>((contentBlock) => {
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
      || !(
        (terminalDetails.sessionId === undefined
          || terminalDetails.sessionId === null
          || typeof terminalDetails.sessionId === "string")
        && (terminalDetails.pty_id === undefined
          || terminalDetails.pty_id === null
          || typeof terminalDetails.pty_id === "string")
      )
    ) {
      return null;
    }

    const cwd = typeof terminalDetails.cwd === "string" ? terminalDetails.cwd : null;
    const exitCode = typeof terminalDetails.exitCode === "number" ? terminalDetails.exitCode : null;
    const type = terminalDetails.type === "pty" ? "pty" : "terminal";

    return {
      type,
      command: terminalDetails.command,
      completed: terminalDetails.completed,
      cwd,
      exitCode,
      ...(terminalDetails.pty_id !== undefined
        ? { pty_id: terminalDetails.pty_id as string | null }
        : {}),
      ...(terminalDetails.sessionId !== undefined
        ? { sessionId: terminalDetails.sessionId as string | null }
        : {}),
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

  private async persistContextMessagesSnapshot(snapshotAt: Date, force: boolean): Promise<void> {
    const snapshotAtMilliseconds = snapshotAt.getTime();
    if (
      !force
      && this.lastContextMessagesSnapshotAtMilliseconds !== null
      && snapshotAtMilliseconds - this.lastContextMessagesSnapshotAtMilliseconds
        < PiMonoSessionEventHandler.contextMessagesSnapshotIntervalMilliseconds
    ) {
      return;
    }

    const contextMessagesSnapshot = this.contextMessagesSnapshotProvider();
    if (!Array.isArray(contextMessagesSnapshot)) {
      this.logError("cannot persist session context snapshot without an array of messages", {
        type: "context_messages_snapshot_invalid",
      });
      return;
    }

    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      await updatableDatabase
        .update(agentSessions)
        .set({
          contextMessagesSnapshot,
          contextMessagesSnapshotAt: snapshotAt,
          ...this.buildContextSnapshotValues(),
        })
        .where(and(
          eq(agentSessions.id, this.sessionId),
          ne(agentSessions.status, "archived"),
        ));
    });

    this.lastContextMessagesSnapshotAtMilliseconds = snapshotAtMilliseconds;
  }

  private async persistSessionState(
    values: Record<string, unknown>,
    publishUpdate: boolean,
    includeContextSnapshot: boolean,
  ): Promise<void> {
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as unknown as UpdatableDatabase;
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

  private resolveMessageErrorMessage(message: SessionMessage): string | null {
    if (typeof message.errorMessage !== "string") {
      return null;
    }

    return this.providerErrorAdapterRegistry.formatErrorMessage({
      errorMessage: message.errorMessage,
      modelProvider: this.modelProviderCredentialProvider ?? null,
    });
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
    const queuedMessageId = queuedUserMessageDispatch.queuedMessageId;
    const dispatchedAt = this.resolveMessageTimestamp(sessionEvent.message?.timestamp);
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as unknown as UpdatableDatabase;
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
          eq(sessionQueuedMessages.id, queuedMessageId),
          eq(sessionQueuedMessages.status, "processing"),
        ));
    });
    queuedUserMessageDispatch.dispatched = true;
    await this.publishQueuedMessagesUpdate();
  }

  private async deleteQueuedUserMessage(queuedMessageId: string): Promise<void> {
    const companyId = await this.resolveCompanyId();
    await this.transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as unknown as DeletableDatabase;
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
    const attribution = await this.resolveSessionAttribution();
    return attribution.companyId;
  }

  private async resolveSessionAttribution(): Promise<SessionAttribution> {
    if (
      this.companyId
      && this.agentId
      && this.modelProviderCredentialId
    ) {
      return {
        agentId: this.agentId,
        apiKey: this.modelProviderCredentialApiKey ?? null,
        baseUrl: this.modelProviderCredentialBaseUrl ?? null,
        companyId: this.companyId,
        modelProviderCredentialId: this.modelProviderCredentialId,
        modelProvider: this.modelProviderCredentialProvider ?? null,
      };
    }

    const attribution = await this.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as {
        execute?(query: unknown): Promise<unknown>;
        select(selection: Record<string, unknown>): {
          from(table: unknown): {
            where(condition: unknown): Promise<Array<Record<string, unknown>>>;
          };
        };
      };
      const [sessionRecord] = await selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          companyId: agentSessions.companyId,
          currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
        })
        .from(agentSessions)
        .where(eq(agentSessions.id, this.sessionId));
      const companyId = sessionRecord?.companyId;
      const currentModelProviderCredentialModelId = typeof sessionRecord?.currentModelProviderCredentialModelId === "string"
        ? sessionRecord.currentModelProviderCredentialModelId
        : "";
      if (typeof companyId !== "string") {
        return {
          agentId: sessionRecord?.agentId,
          apiKey: null,
          baseUrl: null,
          companyId,
          modelProviderCredentialId: undefined,
          modelProvider: null,
        };
      }

      const [credentialModelRecord] = await selectableDatabase
        .select({
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, companyId),
          eq(modelProviderCredentialModels.id, currentModelProviderCredentialModelId),
        ));
      const modelProviderCredentialId = credentialModelRecord?.modelProviderCredentialId;
      if (typeof modelProviderCredentialId !== "string") {
        return {
          agentId: sessionRecord?.agentId,
          apiKey: null,
          baseUrl: null,
          companyId,
          modelProviderCredentialId: undefined,
          modelProvider: null,
        };
      }

      const [credentialRecord] = await selectableDatabase
        .select({
          baseUrl: modelProviderCredentials.baseUrl,
          encryptedApiKey: modelProviderCredentials.encryptedApiKey,
          modelProvider: modelProviderCredentials.modelProvider,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, modelProviderCredentialId),
        ));

      return {
        agentId: sessionRecord?.agentId,
        apiKey: typeof credentialRecord?.encryptedApiKey === "string" ? credentialRecord.encryptedApiKey : null,
        baseUrl: typeof credentialRecord?.baseUrl === "string" ? credentialRecord.baseUrl : null,
        companyId,
        modelProviderCredentialId,
        modelProvider: typeof credentialRecord?.modelProvider === "string" ? credentialRecord.modelProvider : null,
      };
    });

    const companyId = attribution.companyId;
    const agentId = attribution.agentId;
    const apiKey = attribution.apiKey;
    const baseUrl = attribution.baseUrl;
    const modelProviderCredentialId = attribution.modelProviderCredentialId;
    const modelProvider = attribution.modelProvider;
    if (
      typeof companyId !== "string"
      || typeof agentId !== "string"
      || typeof modelProviderCredentialId !== "string"
    ) {
      throw new Error("Session attribution not found.");
    }

    this.companyId = companyId;
    this.agentId = agentId;
    this.modelProviderCredentialApiKey = apiKey ?? undefined;
    this.modelProviderCredentialBaseUrl = typeof baseUrl === "string" ? baseUrl : null;
    this.modelProviderCredentialId = modelProviderCredentialId;
    this.modelProviderCredentialProvider = modelProvider ?? undefined;
    return {
      agentId,
      apiKey,
      baseUrl: this.modelProviderCredentialBaseUrl,
      companyId,
      modelProviderCredentialId,
      modelProvider,
    };
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

  private logDebug(
    logMessage: string,
    sessionEvent: SessionEvent,
    fields: Record<string, unknown> = {},
    persistedMessageReference?: PersistedSessionMessageReference | null,
  ): void {
    this.logger.debug({
      ...this.buildSessionEventLogFields(sessionEvent, fields, persistedMessageReference),
      logMessage,
      session_event: sessionEvent,
    });
  }

  private logError(
    logMessage: string,
    sessionEvent: SessionEvent,
    fields: Record<string, unknown> = {},
    persistedMessageReference?: PersistedSessionMessageReference | null,
  ): void {
    this.logger.error({
      ...this.buildSessionEventLogFields(sessionEvent, fields, persistedMessageReference),
      logMessage,
      session_event: sessionEvent,
    });
  }

  private buildSessionEventLogFields(
    sessionEvent: SessionEvent,
    fields: Record<string, unknown>,
    persistedMessageReference?: PersistedSessionMessageReference | null,
  ): Record<string, unknown> {
    return {
      event: this.resolveSessionEventLogValue(sessionEvent, fields),
      message_id: this.resolveFieldValue(fields, "message_id", persistedMessageReference?.messageId ?? this.lookupMessageId(sessionEvent)),
      status_from: this.resolveFieldValue(fields, "status_from", null),
      status_to: this.resolveFieldValue(fields, "status_to", null),
      tool_name: this.resolveFieldValue(fields, "tool_name", this.lookupToolName(sessionEvent)),
      turn_id: this.resolveFieldValue(fields, "turn_id", persistedMessageReference?.turnId ?? this.currentTurnId),
      ...fields,
    };
  }

  private resolveSessionEventLogValue(sessionEvent: SessionEvent, fields: Record<string, unknown>): string {
    const explicitEvent = this.resolveFieldValue(fields, "event", null);
    if (typeof explicitEvent === "string") {
      return explicitEvent;
    }

    const eventType = typeof sessionEvent.type === "string" ? sessionEvent.type : "unknown";
    const role = typeof sessionEvent.message?.role === "string" ? sessionEvent.message.role : null;
    return role ? `pi_mono_${eventType}_${role}` : `pi_mono_${eventType}`;
  }

  private lookupMessageId(sessionEvent: SessionEvent): string | null {
    const eventMessage = sessionEvent.message ?? this.createToolExecutionSessionEvent(sessionEvent).message;
    if (!eventMessage?.role) {
      return null;
    }

    return this.messageIdByEventKey.get(this.createEventKey(eventMessage)) ?? null;
  }

  private lookupToolName(sessionEvent: SessionEvent): string | null {
    return sessionEvent.toolName ?? sessionEvent.message?.toolName ?? null;
  }

  private resolveFieldValue<T>(fields: Record<string, unknown>, key: string, fallback: T): T | unknown {
    if (!Object.prototype.hasOwnProperty.call(fields, key)) {
      return fallback;
    }

    return fields[key];
  }

  private logEnhanced(
    companyId: string,
    diagnosticComponent: string,
    diagnosticEvent: string,
    fields: Record<string, unknown>,
  ): void {
    if (!this.enhancedLoggingService.shouldLogEnhanced(companyId, diagnosticComponent, this.sessionId)) {
      return;
    }

    this.logger.info({
      ...fields,
      companyId,
      diagnostic: "enhanced",
      diagnosticComponent,
      diagnosticEvent,
      event: diagnosticEvent,
    }, "enhanced diagnostic log");
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
