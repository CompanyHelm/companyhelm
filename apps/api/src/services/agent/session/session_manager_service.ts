import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { ApiLogger } from "../../../log/api_logger.ts";
import { agents, agentSessions, modelProviderCredentialModels } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { RedisCompanyScopedService } from "../../redis/company_scoped_service.ts";
import { RedisService } from "../../redis/service.ts";
import { SessionProcessPubSubNames } from "./process/pub_sub_names.ts";
import { SessionProcessQueueService } from "./process/queue.ts";
import { SessionQueuedMessageService } from "./process/queued_messages.ts";
import { SessionProcessQueuedNames } from "./process/queued_names.ts";

type AgentRecord = {
  defaultModelProviderCredentialModelId: string | null;
  defaultReasoningLevel: string | null;
  id: string;
};

type ExistingSessionRow = {
  id: string;
  status: string;
};

type ModelRecord = {
  id: string;
  modelId: string;
  modelProviderCredentialId: string;
};

type SessionRecord = {
  agentId: string;
  createdAt: Date;
  currentModelId: string;
  currentReasoningLevel: string;
  id: string;
  inferredTitle: string | null;
  isThinking: boolean;
  status: string;
  thinkingText: string | null;
  updatedAt: Date;
  userSetTitle: string | null;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

/**
 * Owns the persisted ingress for agent-session work. Its scope is resolving the session defaults,
 * storing session rows and queued user messages in Postgres, and nudging the BullMQ wake queue plus
 * Redis session-update channels after the transaction commits.
 */
@injectable()
export class SessionManagerService {
  private readonly logger: PinoLogger;
  private readonly redisService: RedisService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly sessionProcessQueueService: SessionProcessQueueService;
  private readonly sessionProcessQueuedNames: SessionProcessQueuedNames;
  private readonly sessionQueuedMessageService: SessionQueuedMessageService;

  constructor(
    @inject(ApiLogger) logger: ApiLogger,
    @inject(RedisService) redisService: RedisService,
    @inject(SessionProcessPubSubNames) sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
    @inject(SessionProcessQueueService) sessionProcessQueueService: SessionProcessQueueService,
    @inject(SessionProcessQueuedNames) sessionProcessQueuedNames: SessionProcessQueuedNames = new SessionProcessQueuedNames(),
    @inject(SessionQueuedMessageService) sessionQueuedMessageService: SessionQueuedMessageService = new SessionQueuedMessageService(),
  ) {
    this.logger = logger.child({
      component: "session_manager_service",
    });
    this.redisService = redisService;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
    this.sessionProcessQueueService = sessionProcessQueueService;
    this.sessionProcessQueuedNames = sessionProcessQueuedNames;
    this.sessionQueuedMessageService = sessionQueuedMessageService;
  }

  async createSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    userMessage: string,
    modelId?: string | null,
    reasoningLevel?: string | null,
    sessionId?: string | null,
  ): Promise<SessionRecord> {
    const sessionRecord = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const [agentRecord] = await selectableDatabase
        .select({
          id: agents.id,
          defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
          defaultReasoningLevel: agents.default_reasoning_level,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, agentId),
        )) as AgentRecord[];
      if (!agentRecord) {
        throw new Error("Agent not found.");
      }

      const defaultModelRecord = await this.resolveDefaultModelRecord(
        selectableDatabase,
        companyId,
        agentRecord,
      );
      const resolvedModelId = this.resolveModelId(defaultModelRecord, modelId);
      const resolvedReasoningLevel = this.resolveReasoningLevel(agentRecord, reasoningLevel);
      const inferredTitle = this.inferTitle(userMessage);
      const resolvedSessionId = String(sessionId || "").trim();
      const now = new Date();
      const [createdSessionRecord] = await insertableDatabase
        .insert(agentSessions)
        .values({
          ...(resolvedSessionId.length > 0 ? { id: resolvedSessionId } : {}),
          companyId,
          agentId,
          currentModelId: resolvedModelId,
          currentModelProviderCredentialId: defaultModelRecord.modelProviderCredentialId,
          currentReasoningLevel: resolvedReasoningLevel,
          inferredTitle,
          isThinking: false,
          status: "queued",
          thinkingText: null,
          created_at: now,
          updated_at: now,
        })
        .returning?.(this.sessionSelection()) as SessionRecord[];
      if (!createdSessionRecord) {
        throw new Error("Failed to create session.");
      }

      await this.sessionQueuedMessageService.enqueueInTransaction(insertableDatabase, {
        companyId,
        sessionId: createdSessionRecord.id,
        shouldSteer: false,
        text: userMessage,
      });

      return createdSessionRecord;
    });

    await this.publishSessionUpdate(companyId, sessionRecord.id);
    await this.sessionProcessQueueService.enqueueSessionWake(companyId, sessionRecord.id);

    this.logger.info({
      agentId,
      companyId,
      modelId: sessionRecord.currentModelId,
      reasoningLevel: sessionRecord.currentReasoningLevel,
      sessionId: sessionRecord.id,
    }, "created agent session");

    return sessionRecord;
  }

  async archiveSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<SessionRecord> {
    const sessionRecord = await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const now = new Date();
      const [updatedSessionRecord] = await updatableDatabase
        .update(agentSessions)
        .set({
          status: "archived",
          updated_at: now,
        })
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        ))
        .returning?.(this.sessionSelection()) as SessionRecord[];

      if (!updatedSessionRecord) {
        throw new Error("Session not found.");
      }

      return updatedSessionRecord;
    });

    await this.publishSessionUpdate(companyId, sessionRecord.id);

    this.logger.info({
      companyId,
      sessionId,
    }, "archived agent session");

    return sessionRecord;
  }

  async prompt(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    userMessage: string,
    shouldSteer = false,
  ): Promise<SessionRecord> {
    const sessionRecord = await transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const [existingSession] = await selectableDatabase
        .select({
          id: agentSessions.id,
          status: agentSessions.status,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        )) as ExistingSessionRow[];
      if (!existingSession) {
        throw new Error("Session not found.");
      }
      if (existingSession.status === "archived") {
        throw new Error("Archived sessions cannot receive new messages.");
      }

      const now = new Date();
      const [updatedSessionRecord] = await updatableDatabase
        .update(agentSessions)
        .set({
          status: existingSession.status === "running" ? "running" : "queued",
          updated_at: now,
        })
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        ))
        .returning?.(this.sessionSelection()) as SessionRecord[];
      if (!updatedSessionRecord) {
        throw new Error("Failed to update session.");
      }

      await this.sessionQueuedMessageService.enqueueInTransaction(insertableDatabase, {
        companyId,
        sessionId,
        shouldSteer,
        text: userMessage,
      });

      return updatedSessionRecord;
    });

    await this.publishSessionUpdate(companyId, sessionId);
    await this.sessionProcessQueueService.enqueueSessionWake(companyId, sessionId);
    if (shouldSteer) {
      await this.publishSteer(companyId, sessionId);
    }

    this.logger.info({
      companyId,
      sessionId,
      shouldSteer,
    }, "queued session prompt");

    return sessionRecord;
  }

  private async resolveDefaultModelRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentRecord: AgentRecord,
  ): Promise<ModelRecord> {
    if (!agentRecord.defaultModelProviderCredentialModelId) {
      throw new Error("Agent default model is required.");
    }

    const [modelRecord] = await selectableDatabase
      .select({
        id: modelProviderCredentialModels.id,
        modelId: modelProviderCredentialModels.modelId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.id, agentRecord.defaultModelProviderCredentialModelId),
      )) as ModelRecord[];
    if (!modelRecord) {
      throw new Error("Agent default model not found.");
    }

    return modelRecord;
  }

  private resolveModelId(defaultModelRecord: ModelRecord, modelId?: string | null): string {
    if (modelId) {
      return modelId;
    }

    return defaultModelRecord.modelId;
  }

  private resolveReasoningLevel(
    agentRecord: AgentRecord,
    reasoningLevel?: string | null,
  ): string {
    if (reasoningLevel) {
      return reasoningLevel;
    }

    return agentRecord.defaultReasoningLevel ?? "";
  }

  private inferTitle(userMessage: string): string | null {
    const trimmedMessage = userMessage.trim();
    if (trimmedMessage.length === 0) {
      return null;
    }

    return trimmedMessage.slice(0, 50);
  }

  private sessionSelection(): Record<string, unknown> {
    return {
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
    };
  }

  private async publishSteer(companyId: string, sessionId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessQueuedNames.getSessionSteerChannel(sessionId));
  }

  private async publishSessionUpdate(companyId: string, sessionId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionUpdateChannel(sessionId));
  }
}
