import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { agentSessions } from "../../../db/schema.ts";
import { RedisCompanyScopedService } from "../../redis/company_scoped_service.ts";
import { RedisService } from "../../redis/service.ts";
import { SessionProcessPubSubNames } from "./process/pub_sub_names.ts";
import { SessionProcessQueueService } from "./process/queue.ts";
import {
  SessionQueuedMessageService,
  type QueuedSessionMessageRecord,
} from "./process/queued_messages.ts";
import { SessionProcessQueuedNames } from "./process/queued_names.ts";
import { SessionModelSelectionService } from "./session_model_selection_service.ts";
import type {
  DeletableDatabase,
  ExistingSessionRow,
  InsertableDatabase,
  SelectableDatabase,
  SessionManagerQueuePromptOptions,
  SessionPromptImageInput,
  SessionRecord,
  UpdatableDatabase,
} from "./session_manager_service_types.ts";
import { agentSessionSelection } from "./session_manager_service_types.ts";

type PreparedSessionPrompt = {
  inferredTitle: string | null;
  queuedImages: SessionPromptImageInput[];
};

/**
 * Owns queued prompt ingress for existing sessions. It validates prompt payloads, updates the
 * runtime model settings attached to the session, persists queued message rows, and nudges the
 * wake or steer channels that drive worker-side prompt delivery.
 */
@injectable()
export class SessionPromptService {
  private readonly redisService: RedisService;
  private readonly sessionModelSelectionService: SessionModelSelectionService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly sessionProcessQueueService: SessionProcessQueueService;
  private readonly sessionProcessQueuedNames: SessionProcessQueuedNames;
  private readonly sessionQueuedMessageService: SessionQueuedMessageService;

  constructor(
    @inject(RedisService) redisService: RedisService,
    @inject(SessionModelSelectionService)
    sessionModelSelectionService: SessionModelSelectionService,
    @inject(SessionProcessPubSubNames)
    sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
    @inject(SessionProcessQueueService) sessionProcessQueueService: SessionProcessQueueService,
    @inject(SessionProcessQueuedNames)
    sessionProcessQueuedNames: SessionProcessQueuedNames = new SessionProcessQueuedNames(),
    @inject(SessionQueuedMessageService)
    sessionQueuedMessageService: SessionQueuedMessageService = new SessionQueuedMessageService(),
  ) {
    this.redisService = redisService;
    this.sessionModelSelectionService = sessionModelSelectionService;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
    this.sessionProcessQueueService = sessionProcessQueueService;
    this.sessionProcessQueuedNames = sessionProcessQueuedNames;
    this.sessionQueuedMessageService = sessionQueuedMessageService;
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
    userId?: string | null,
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
          userId,
        },
      );
    });

    await this.notifyQueuedSessionMessage(companyId, sessionId, shouldSteer);

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
        ownerUserId: agentSessions.ownerUserId,
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
    this.assertUserCanMutateSession(existingSession.ownerUserId, options.userId);
    if (existingSession.status === "archived") {
      throw new Error("Archived sessions cannot receive new messages.");
    }

    const selectedModelRecord = options.modelProviderCredentialModelId
      ? await this.sessionModelSelectionService.resolveModelRecordById(
        selectableDatabase,
        companyId,
        options.modelProviderCredentialModelId,
      )
      : await this.sessionModelSelectionService.resolveCurrentModelRecord(
        selectableDatabase,
        companyId,
        existingSession,
      );
    const resolvedReasoningLevel = this.sessionModelSelectionService.resolveReasoningLevel(
      selectedModelRecord.reasoningLevels,
      options.reasoningLevel,
      existingSession.currentReasoningLevel,
    );
    const preparedPrompt = this.prepareQueuedPrompt(userMessage, options.images);
    const now = new Date();
    const [updatedSessionRecord] = await updatableDatabase
      .update(agentSessions)
      .set({
        currentModelProviderCredentialModelId: selectedModelRecord.id,
        currentReasoningLevel: resolvedReasoningLevel,
        lastUserMessageAt: now,
        status: existingSession.status === "running" ? "running" : "queued",
        updated_at: now,
      })
      .where(and(
        eq(agentSessions.companyId, companyId),
        eq(agentSessions.id, sessionId),
      ))
      .returning?.(agentSessionSelection) as SessionRecord[];
    if (!updatedSessionRecord) {
      throw new Error("Failed to update session.");
    }

    await this.enqueuePreparedPromptInTransaction(
      insertableDatabase,
      companyId,
      sessionId,
      userMessage,
      preparedPrompt,
      options.shouldSteer ?? false,
    );

    return {
      ...updatedSessionRecord,
      currentModelId: selectedModelRecord.modelId,
    };
  }

  prepareQueuedPrompt(
    userMessage: string,
    images?: SessionPromptImageInput[],
  ): PreparedSessionPrompt {
    const queuedImages = this.resolvePromptImages(images);

    return {
      inferredTitle: this.inferTitle(userMessage, queuedImages.length),
      queuedImages,
    };
  }

  async enqueuePreparedPromptInTransaction(
    insertableDatabase: InsertableDatabase,
    companyId: string,
    sessionId: string,
    userMessage: string,
    preparedPrompt: PreparedSessionPrompt,
    shouldSteer: boolean,
  ): Promise<void> {
    await this.sessionQueuedMessageService.enqueueInTransaction(
      insertableDatabase as unknown as SelectableDatabase & InsertableDatabase & UpdatableDatabase,
      {
        companyId,
        images: preparedPrompt.queuedImages,
        sessionId,
        shouldSteer,
        text: userMessage,
      },
    );
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

    return queuedMessage;
  }

  async deleteAllQueuedMessagesForSessionInTransaction(
    deletableDatabase: DeletableDatabase,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    await this.sessionQueuedMessageService.deleteAllForSessionInTransaction(
      deletableDatabase as never,
      companyId,
      sessionId,
    );
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

  private assertUserCanMutateSession(ownerUserId?: string | null, userId?: string | null): void {
    if (!userId || !ownerUserId) {
      return;
    }
    if (ownerUserId !== userId) {
      throw new Error("Session not found.");
    }
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

  private async publishSteer(companyId: string, sessionId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessQueuedNames.getSessionSteerChannel(sessionId));
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
