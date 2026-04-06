import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { ApiLogger } from "../../../log/api_logger.ts";
import {
  agentDefaultSecrets,
  agentSessions,
  agentSessionSecrets,
  agents,
  modelProviderCredentialModels,
} from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { RedisCompanyScopedService } from "../../redis/company_scoped_service.ts";
import { RedisService } from "../../redis/service.ts";
import { SessionProcessPubSubNames } from "./process/pub_sub_names.ts";
import { SessionProcessQueueService } from "./process/queue.ts";
import {
  SessionQueuedMessageService,
  type QueuedSessionMessageRecord,
} from "./process/queued_messages.ts";
import { SessionProcessQueuedNames } from "./process/queued_names.ts";

type AgentRecord = {
  defaultModelProviderCredentialModelId: string | null;
  defaultReasoningLevel: string | null;
  id: string;
};

type ExistingSessionRow = {
  agentId: string;
  currentModelProviderCredentialModelId: string;
  currentReasoningLevel: string;
  id: string;
  status: string;
  userSetTitle?: string | null;
};

type ModelRecord = {
  id: string;
  modelId: string;
  modelProviderCredentialId: string;
  reasoningLevels: string[] | null;
};

type AgentDefaultSecretRecord = {
  createdByUserId: string | null;
  secretId: string;
};

type SessionRecord = {
  agentId: string;
  createdAt: Date;
  currentContextTokens: number | null;
  currentModelId: string;
  currentModelProviderCredentialModelId: string;
  currentReasoningLevel: string;
  id: string;
  inferredTitle: string | null;
  isCompacting: boolean;
  isThinking: boolean;
  maxContextTokens: number | null;
  status: string;
  thinkingText: string | null;
  updatedAt: Date;
  userSetTitle: string | null;
};

export type SessionPromptImageInput = {
  base64EncodedImage: string;
  mimeType: string;
};

export type SessionManagerCreateSessionOptions = {
  images?: SessionPromptImageInput[];
  modelProviderCredentialModelId?: string | null;
  reasoningLevel?: string | null;
  sessionId?: string | null;
  shouldSteer?: boolean;
  userId?: string | null;
};

export type SessionManagerQueuePromptOptions = {
  images?: SessionPromptImageInput[];
  modelProviderCredentialModelId?: string | null;
  reasoningLevel?: string | null;
  shouldSteer?: boolean;
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
    values(value: Record<string, unknown> | Record<string, unknown>[]): {
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

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
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
    modelProviderCredentialModelId?: string | null,
    reasoningLevel?: string | null,
    sessionId?: string | null,
    userId?: string | null,
    images?: SessionPromptImageInput[],
  ): Promise<SessionRecord> {
    const sessionRecord = await transactionProvider.transaction(async (tx) => {
      return this.createSessionInTransaction(
        tx as SelectableDatabase,
        tx as InsertableDatabase,
        companyId,
        agentId,
        userMessage,
        {
          images,
          modelProviderCredentialModelId,
          reasoningLevel,
          sessionId,
          userId,
        },
      );
    });

    await this.notifyQueuedSessionMessage(companyId, sessionRecord.id, false);

    this.logger.info({
      agentId,
      companyId,
      modelId: sessionRecord.currentModelId,
      reasoningLevel: sessionRecord.currentReasoningLevel,
      sessionId: sessionRecord.id,
    }, "created agent session");

    return sessionRecord;
  }

  async createSessionInTransaction(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    companyId: string,
    agentId: string,
    userMessage: string,
    options: SessionManagerCreateSessionOptions = {},
  ): Promise<SessionRecord> {
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

    const selectedModelRecord = options.modelProviderCredentialModelId
      ? await this.resolveModelRecordById(
        selectableDatabase,
        companyId,
        options.modelProviderCredentialModelId,
      )
      : await this.resolveDefaultModelRecord(
        selectableDatabase,
        companyId,
        agentRecord,
      );
    const resolvedReasoningLevel = this.resolveReasoningLevel(
      selectedModelRecord.reasoningLevels,
      options.reasoningLevel,
      agentRecord.defaultReasoningLevel,
    );
    const queuedImages = this.resolvePromptImages(options.images);
    const inferredTitle = this.inferTitle(userMessage, queuedImages.length);
    const resolvedSessionId = String(options.sessionId || "").trim();
    const now = new Date();
    const [createdSessionRecord] = await insertableDatabase
      .insert(agentSessions)
      .values({
        ...(resolvedSessionId.length > 0 ? { id: resolvedSessionId } : {}),
        companyId,
        currentContextTokens: null,
        agentId,
        currentModelProviderCredentialModelId: selectedModelRecord.id,
        currentReasoningLevel: resolvedReasoningLevel,
        inferredTitle,
        isCompacting: false,
        isThinking: false,
        maxContextTokens: null,
        status: "queued",
        thinkingText: null,
        created_at: now,
        updated_at: now,
      })
      .returning?.(this.sessionSelection()) as SessionRecord[];
    if (!createdSessionRecord) {
      throw new Error("Failed to create session.");
    }

    await this.copyAgentDefaultSecretsToSession(
      selectableDatabase,
      insertableDatabase,
      companyId,
      agentId,
      createdSessionRecord.id,
      options.userId,
    );

    await this.sessionQueuedMessageService.enqueueInTransaction(insertableDatabase, {
      companyId,
      images: queuedImages,
      sessionId: createdSessionRecord.id,
      shouldSteer: options.shouldSteer ?? false,
      text: userMessage,
    });

    return {
      ...createdSessionRecord,
      currentModelId: selectedModelRecord.modelId,
    };
  }

  private async copyAgentDefaultSecretsToSession(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    companyId: string,
    agentId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<void> {
    const defaultSecrets = await selectableDatabase
      .select({
        createdByUserId: agentDefaultSecrets.createdByUserId,
        secretId: agentDefaultSecrets.secretId,
      })
      .from(agentDefaultSecrets)
      .where(and(
        eq(agentDefaultSecrets.companyId, companyId),
        eq(agentDefaultSecrets.agentId, agentId),
      )) as AgentDefaultSecretRecord[];

    if (defaultSecrets.length === 0) {
      return;
    }

    await insertableDatabase
      .insert(agentSessionSecrets)
      .values(defaultSecrets.map((defaultSecret) => ({
        companyId,
        createdAt: new Date(),
        createdByUserId: userId ?? defaultSecret.createdByUserId,
        secretId: defaultSecret.secretId,
        sessionId,
      })));
  }

  async archiveSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<SessionRecord> {
    const { shouldInterrupt, sessionRecord } = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const [existingSession] = await selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
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

      await this.sessionQueuedMessageService.deleteAllForSessionInTransaction(
        deletableDatabase,
        companyId,
        sessionId,
      );

      const currentModelRecord = await this.resolveModelRecordById(
        selectableDatabase,
        companyId,
        updatedSessionRecord.currentModelProviderCredentialModelId,
      );

      return {
        sessionRecord: {
          ...updatedSessionRecord,
          currentModelId: currentModelRecord.modelId,
        },
        shouldInterrupt: existingSession.status === "running",
      };
    });

    if (shouldInterrupt) {
      await this.publishInterrupt(companyId, sessionRecord.id);
    }
    await this.publishQueuedMessagesUpdate(companyId, sessionRecord.id);
    await this.publishSessionUpdate(companyId, sessionRecord.id);

    this.logger.info({
      companyId,
      sessionId,
    }, "archived agent session");

    return sessionRecord;
  }

  async interruptSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    const shouldInterrupt = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [existingSession] = await selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
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
        throw new Error("Archived sessions cannot be interrupted.");
      }

      return existingSession.status === "running";
    });

    if (!shouldInterrupt) {
      return;
    }

    await this.publishInterrupt(companyId, sessionId);
    this.logger.info({
      companyId,
      sessionId,
    }, "interrupted agent session");
  }

  async prompt(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    userMessage: string,
    modelProviderCredentialModelId?: string | null,
    reasoningLevel?: string | null,
    shouldSteer = false,
    images?: SessionPromptImageInput[],
  ): Promise<SessionRecord> {
    const sessionRecord = await transactionProvider.transaction(async (tx) => {
      return this.queuePromptInTransaction(
        tx as SelectableDatabase,
        tx as InsertableDatabase,
        tx as UpdatableDatabase,
        companyId,
        sessionId,
        userMessage,
        {
          images,
          modelProviderCredentialModelId,
          reasoningLevel,
          shouldSteer,
        },
      );
    });

    await this.notifyQueuedSessionMessage(companyId, sessionId, shouldSteer);

    this.logger.info({
      companyId,
      modelId: sessionRecord.currentModelId,
      reasoningLevel: sessionRecord.currentReasoningLevel,
      sessionId,
      shouldSteer,
    }, "queued session prompt");

    return sessionRecord;
  }

  async updateSessionTitle(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    title: string | null | undefined,
  ): Promise<SessionRecord> {
    const sessionRecord = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const [existingSession] = await selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          id: agentSessions.id,
          status: agentSessions.status,
          userSetTitle: agentSessions.userSetTitle,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        )) as ExistingSessionRow[];
      if (!existingSession) {
        throw new Error("Session not found.");
      }

      const [updatedSessionRecord] = await updatableDatabase
        .update(agentSessions)
        .set({
          updated_at: new Date(),
          userSetTitle: this.resolveUserSetTitle(title),
        })
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        ))
        .returning?.(this.sessionSelection()) as SessionRecord[];
      if (!updatedSessionRecord) {
        throw new Error("Session not found.");
      }

      const currentModelRecord = await this.resolveCurrentModelRecord(
        selectableDatabase,
        companyId,
        {
          ...existingSession,
          currentModelProviderCredentialModelId: updatedSessionRecord.currentModelProviderCredentialModelId,
          currentReasoningLevel: updatedSessionRecord.currentReasoningLevel,
          status: updatedSessionRecord.status,
          userSetTitle: updatedSessionRecord.userSetTitle,
        },
      );

      return {
        ...updatedSessionRecord,
        currentModelId: currentModelRecord.modelId,
      };
    });

    await this.publishSessionUpdate(companyId, sessionRecord.id);

    this.logger.info({
      companyId,
      sessionId: sessionRecord.id,
      userSetTitle: sessionRecord.userSetTitle,
    }, "updated agent session title");

    return sessionRecord;
  }

  async queuePromptInTransaction(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    updatableDatabase: UpdatableDatabase,
    companyId: string,
    sessionId: string,
    userMessage: string,
    options: SessionManagerQueuePromptOptions = {},
  ): Promise<SessionRecord> {
    const [existingSession] = await selectableDatabase
      .select({
        agentId: agentSessions.agentId,
        currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
        currentReasoningLevel: agentSessions.currentReasoningLevel,
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

    const selectedModelRecord = options.modelProviderCredentialModelId
      ? await this.resolveModelRecordById(
        selectableDatabase,
        companyId,
        options.modelProviderCredentialModelId,
      )
      : await this.resolveCurrentModelRecord(
        selectableDatabase,
        companyId,
        existingSession,
      );
    const resolvedReasoningLevel = this.resolveReasoningLevel(
      selectedModelRecord.reasoningLevels,
      options.reasoningLevel,
      existingSession.currentReasoningLevel,
    );
    const queuedImages = this.resolvePromptImages(options.images);
    const now = new Date();
    const [updatedSessionRecord] = await updatableDatabase
      .update(agentSessions)
      .set({
        currentModelProviderCredentialModelId: selectedModelRecord.id,
        currentReasoningLevel: resolvedReasoningLevel,
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
      images: queuedImages,
      sessionId,
      shouldSteer: options.shouldSteer ?? false,
      text: userMessage,
    });

    return {
      ...updatedSessionRecord,
      currentModelId: selectedModelRecord.modelId,
    };
  }

  async steerQueuedMessage(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    queuedMessageId: string,
  ): Promise<QueuedSessionMessageRecord> {
    const queuedMessage = await this.sessionQueuedMessageService.markSteer(
      transactionProvider,
      companyId,
      queuedMessageId,
    );

    await this.publishQueuedMessagesUpdate(companyId, queuedMessage.sessionId);
    await this.publishSteer(companyId, queuedMessage.sessionId);

    this.logger.info({
      companyId,
      queuedMessageId,
      sessionId: queuedMessage.sessionId,
    }, "steered queued session message");

    return queuedMessage;
  }

  async deleteQueuedMessage(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    queuedMessageId: string,
  ): Promise<QueuedSessionMessageRecord> {
    const queuedMessage = await this.sessionQueuedMessageService.deletePendingUserMessage(
      transactionProvider,
      companyId,
      queuedMessageId,
    );

    await this.publishQueuedMessagesUpdate(companyId, queuedMessage.sessionId);

    this.logger.info({
      companyId,
      queuedMessageId,
      sessionId: queuedMessage.sessionId,
    }, "deleted queued session message");

    return queuedMessage;
  }

  async notifyQueuedSessionMessage(
    companyId: string,
    sessionId: string,
    shouldSteer: boolean,
  ): Promise<void> {
    await this.publishQueuedMessagesUpdate(companyId, sessionId);
    await this.publishSessionUpdate(companyId, sessionId);
    await this.sessionProcessQueueService.enqueueSessionWake(companyId, sessionId);
    if (shouldSteer) {
      await this.publishSteer(companyId, sessionId);
    }
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
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
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

  private async resolveModelRecordById(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    modelProviderCredentialModelId: string,
  ): Promise<ModelRecord> {
    const [modelRecord] = await selectableDatabase
      .select({
        id: modelProviderCredentialModels.id,
        modelId: modelProviderCredentialModels.modelId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.id, modelProviderCredentialModelId),
      )) as ModelRecord[];
    if (!modelRecord) {
      throw new Error("Selected model not found.");
    }

    return modelRecord;
  }

  private async resolveCurrentModelRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    existingSession: ExistingSessionRow,
  ): Promise<ModelRecord> {
    const [modelRecord] = await selectableDatabase
      .select({
        id: modelProviderCredentialModels.id,
        modelId: modelProviderCredentialModels.modelId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.id, existingSession.currentModelProviderCredentialModelId),
      )) as ModelRecord[];
    if (!modelRecord) {
      throw new Error("Current session model not found.");
    }

    return modelRecord;
  }

  private resolveReasoningLevel(
    supportedLevels: string[] | null,
    requestedReasoningLevel?: string | null,
    fallbackReasoningLevel?: string | null,
  ): string {
    const availableLevels = supportedLevels?.filter((level) => level.length > 0) ?? [];
    if (availableLevels.length === 0) {
      if (requestedReasoningLevel) {
        throw new Error("reasoningLevel is not supported for the selected model.");
      }

      return "";
    }
    if (requestedReasoningLevel) {
      if (!availableLevels.includes(requestedReasoningLevel)) {
        throw new Error("reasoningLevel is not supported for the selected model.");
      }

      return requestedReasoningLevel;
    }
    if (fallbackReasoningLevel && availableLevels.includes(fallbackReasoningLevel)) {
      return fallbackReasoningLevel;
    }

    return availableLevels[0] ?? "";
  }

  private inferTitle(userMessage: string, imageCount = 0): string | null {
    const trimmedMessage = userMessage.trim();
    if (trimmedMessage.length === 0) {
      if (imageCount <= 0) {
        return null;
      }

      return imageCount === 1 ? "Shared image" : `Shared ${imageCount} images`;
    }

    return trimmedMessage.slice(0, 50);
  }

  private resolveUserSetTitle(title: string | null | undefined): string | null {
    if (title === undefined || title === null) {
      return null;
    }
    if (title.trim().length === 0) {
      return null;
    }

    return title;
  }

  private resolvePromptImages(images?: SessionPromptImageInput[]): SessionPromptImageInput[] {
    if (!images || images.length === 0) {
      return [];
    }

    return images.map((image) => {
      if (image.base64EncodedImage.length === 0) {
        throw new Error("Queued image data is required.");
      }
      if (image.mimeType !== "image/jpeg" && image.mimeType !== "image/png") {
        throw new Error("Only JPEG and PNG images are supported.");
      }

      return image;
    });
  }

  private sessionSelection(): Record<string, unknown> {
    return {
      id: agentSessions.id,
      agentId: agentSessions.agentId,
      currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
      currentReasoningLevel: agentSessions.currentReasoningLevel,
      currentContextTokens: agentSessions.currentContextTokens,
      inferredTitle: agentSessions.inferredTitle,
      isCompacting: agentSessions.isCompacting,
      isThinking: agentSessions.isThinking,
      maxContextTokens: agentSessions.maxContextTokens,
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

  private async publishInterrupt(companyId: string, sessionId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessQueuedNames.getSessionInterruptChannel(sessionId));
  }

  private async publishSessionUpdate(companyId: string, sessionId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionUpdateChannel(sessionId));
  }

  private async publishQueuedMessagesUpdate(companyId: string, sessionId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionQueuedMessagesUpdateChannel(sessionId));
  }
}
