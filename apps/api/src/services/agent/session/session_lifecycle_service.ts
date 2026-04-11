import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { agentInboxItems, agentSessions, agents } from "../../../db/schema.ts";
import { RedisCompanyScopedService } from "../../redis/company_scoped_service.ts";
import { RedisService } from "../../redis/service.ts";
import { AgentInboxPubSubNames } from "../../inbox/pub_sub_names.ts";
import { SessionContextCheckpointService } from "./context_checkpoint_service.ts";
import { SessionProcessPubSubNames } from "./process/pub_sub_names.ts";
import { SessionProcessQueuedNames } from "./process/queued_names.ts";
import { SessionModelSelectionService } from "./session_model_selection_service.ts";
import { SessionPromptService } from "./session_prompt_service.ts";
import { SessionSecretCopyService } from "./session_secret_copy_service.ts";
import type {
  AgentRecord,
  DeletableDatabase,
  ExistingSessionRow,
  InsertableDatabase,
  SelectableDatabase,
  SessionManagerCreateSessionOptions,
  SessionPromptImageInput,
  SessionRecord,
  UpdatableDatabase,
} from "./session_manager_service_types.ts";
import { agentSessionSelection } from "./session_manager_service_types.ts";

/**
 * Owns session lifecycle transitions that are broader than a single queued prompt. It creates new
 * sessions, archives or interrupts active ones, forks from checkpoints, and persists user-chosen
 * titles while delegating prompt ingress, model policy, and secret-copy details to smaller
 * collaborators.
 */
@injectable()
export class SessionLifecycleService {
  private readonly redisService: RedisService;
  private readonly sessionModelSelectionService: SessionModelSelectionService;
  private readonly sessionPromptService: SessionPromptService;
  private readonly sessionSecretCopyService: SessionSecretCopyService;
  private readonly sessionContextCheckpointService: SessionContextCheckpointService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly sessionProcessQueuedNames: SessionProcessQueuedNames;
  private readonly inboxPubSubNames: AgentInboxPubSubNames;

  constructor(
    @inject(RedisService) redisService: RedisService,
    @inject(SessionModelSelectionService)
    sessionModelSelectionService: SessionModelSelectionService,
    @inject(SessionPromptService) sessionPromptService: SessionPromptService,
    @inject(SessionSecretCopyService) sessionSecretCopyService: SessionSecretCopyService,
    @inject(SessionContextCheckpointService)
    sessionContextCheckpointService: SessionContextCheckpointService = new SessionContextCheckpointService(),
    @inject(SessionProcessPubSubNames)
    sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
    @inject(SessionProcessQueuedNames)
    sessionProcessQueuedNames: SessionProcessQueuedNames = new SessionProcessQueuedNames(),
    @inject(AgentInboxPubSubNames)
    inboxPubSubNames: AgentInboxPubSubNames = new AgentInboxPubSubNames(),
  ) {
    this.redisService = redisService;
    this.sessionModelSelectionService = sessionModelSelectionService;
    this.sessionPromptService = sessionPromptService;
    this.sessionSecretCopyService = sessionSecretCopyService;
    this.sessionContextCheckpointService = sessionContextCheckpointService;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
    this.sessionProcessQueuedNames = sessionProcessQueuedNames;
    this.inboxPubSubNames = inboxPubSubNames;
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

    await this.sessionPromptService.notifyQueuedSessionMessage(companyId, sessionRecord.id, false);

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
      ? await this.sessionModelSelectionService.resolveModelRecordById(
        selectableDatabase,
        companyId,
        options.modelProviderCredentialModelId,
      )
      : await this.sessionModelSelectionService.resolveDefaultModelRecord(
        selectableDatabase,
        companyId,
        agentRecord,
      );
    const resolvedReasoningLevel = this.sessionModelSelectionService.resolveReasoningLevel(
      selectedModelRecord.reasoningLevels,
      options.reasoningLevel,
      agentRecord.defaultReasoningLevel,
    );
    const preparedPrompt = this.sessionPromptService.prepareQueuedPrompt(userMessage, options.images);
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
        inferredTitle: preparedPrompt.inferredTitle,
        isCompacting: false,
        isThinking: false,
        maxContextTokens: null,
        ownerUserId: options.userId ?? null,
        status: "queued",
        thinkingText: null,
        created_at: now,
        updated_at: now,
      })
      .returning?.(agentSessionSelection) as SessionRecord[];
    if (!createdSessionRecord) {
      throw new Error("Failed to create session.");
    }

    await this.sessionSecretCopyService.copyAgentDefaultSecretsToSession(
      selectableDatabase,
      insertableDatabase,
      companyId,
      agentId,
      createdSessionRecord.id,
      options.userId,
    );

    await this.sessionPromptService.enqueuePreparedPromptInTransaction(
      insertableDatabase,
      companyId,
      createdSessionRecord.id,
      userMessage,
      preparedPrompt,
      options.shouldSteer ?? false,
    );

    return {
      ...createdSessionRecord,
      currentModelId: selectedModelRecord.modelId,
    };
  }

  async archiveSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<SessionRecord> {
    const { didResolveOpenHumanQuestions, shouldInterrupt, sessionRecord } = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
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
      this.assertUserCanMutateSession(existingSession.ownerUserId, userId);

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
        .returning?.(agentSessionSelection) as SessionRecord[];

      if (!updatedSessionRecord) {
        throw new Error("Session not found.");
      }

      await this.sessionPromptService.deleteAllQueuedMessagesForSessionInTransaction(
        deletableDatabase,
        companyId,
        sessionId,
      );
      const didResolveOpenHumanQuestions = await this.resolveOpenHumanQuestionsForArchivedSessionInTransaction(
        updatableDatabase,
        companyId,
        sessionId,
        now,
        userId,
      );

      const currentModelRecord = await this.sessionModelSelectionService.resolveModelRecordById(
        selectableDatabase,
        companyId,
        updatedSessionRecord.currentModelProviderCredentialModelId,
      );

      return {
        sessionRecord: {
          ...updatedSessionRecord,
          currentModelId: currentModelRecord.modelId,
        },
        didResolveOpenHumanQuestions,
        shouldInterrupt: existingSession.status === "running",
      };
    });

    if (shouldInterrupt) {
      await this.publishInterrupt(companyId, sessionRecord.id);
    }
    await this.publishQueuedMessagesUpdate(companyId, sessionRecord.id);
    await this.publishSessionUpdate(companyId, sessionRecord.id);
    if (didResolveOpenHumanQuestions) {
      await this.publishSessionHumanQuestionsUpdated(companyId, sessionRecord.id);
      await this.publishHumanQuestionsUpdate(companyId);
    }

    return sessionRecord;
  }

  async forkSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    forkedFromTurnId: string,
    userId?: string | null,
  ): Promise<SessionRecord> {
    const sessionRecord = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const [sourceSession] = await selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          id: agentSessions.id,
          inferredTitle: agentSessions.inferredTitle,
          ownerUserId: agentSessions.ownerUserId,
          status: agentSessions.status,
          userSetTitle: agentSessions.userSetTitle,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        )) as ExistingSessionRow[];
      if (!sourceSession) {
        throw new Error("Source session not found.");
      }
      this.assertUserCanMutateSession(sourceSession.ownerUserId, userId);

      const checkpoint = await this.sessionContextCheckpointService.getCheckpointForTurn(
        selectableDatabase,
        companyId,
        forkedFromTurnId,
      );
      if (!checkpoint || checkpoint.sessionId !== sourceSession.id) {
        throw new Error("Fork source turn is unavailable.");
      }

      const currentModelRecord = await this.sessionModelSelectionService.resolveCurrentModelRecord(
        selectableDatabase,
        companyId,
        sourceSession,
      );
      const now = new Date();
      const [createdSessionRecord] = await insertableDatabase
        .insert(agentSessions)
        .values({
          companyId,
          contextMessagesSnapshot: checkpoint.contextMessagesSnapshot,
          contextMessagesSnapshotAt: checkpoint.createdAt,
          currentContextTokens: checkpoint.currentContextTokens,
          agentId: sourceSession.agentId,
          currentModelProviderCredentialModelId: sourceSession.currentModelProviderCredentialModelId,
          currentReasoningLevel: sourceSession.currentReasoningLevel,
          forkedFromTurnId,
          inferredTitle: this.inferForkTitle(sourceSession.userSetTitle ?? sourceSession.inferredTitle ?? null),
          isCompacting: false,
          isThinking: false,
          maxContextTokens: checkpoint.maxContextTokens,
          ownerUserId: userId ?? null,
          status: "stopped",
          thinkingText: null,
          created_at: now,
          updated_at: now,
          userSetTitle: null,
        })
        .returning?.(agentSessionSelection) as SessionRecord[];
      if (!createdSessionRecord) {
        throw new Error("Failed to create forked session.");
      }

      await this.sessionSecretCopyService.copySessionSecretsToSession(
        selectableDatabase,
        insertableDatabase,
        companyId,
        sourceSession.id,
        createdSessionRecord.id,
        userId,
      );

      return {
        ...createdSessionRecord,
        currentModelId: currentModelRecord.modelId,
      };
    });

    await this.publishSessionUpdate(companyId, sessionRecord.id);

    return sessionRecord;
  }

  async interruptSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<boolean> {
    const shouldInterrupt = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
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
      this.assertUserCanMutateSession(existingSession.ownerUserId, userId);
      if (existingSession.status === "archived") {
        throw new Error("Archived sessions cannot be interrupted.");
      }

      return existingSession.status === "running";
    });

    if (!shouldInterrupt) {
      return false;
    }

    await this.publishInterrupt(companyId, sessionId);

    return true;
  }

  async updateSessionTitle(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    title: string | null | undefined,
    userId?: string | null,
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
          ownerUserId: agentSessions.ownerUserId,
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
      this.assertUserCanMutateSession(existingSession.ownerUserId, userId);

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
        .returning?.(agentSessionSelection) as SessionRecord[];
      if (!updatedSessionRecord) {
        throw new Error("Session not found.");
      }

      const currentModelRecord = await this.sessionModelSelectionService.resolveCurrentModelRecord(
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

    return sessionRecord;
  }

  private assertUserCanMutateSession(ownerUserId?: string | null, userId?: string | null): void {
    if (!userId || !ownerUserId) {
      return;
    }
    if (ownerUserId !== userId) {
      throw new Error("Session not found.");
    }
  }

  private inferForkTitle(sourceTitle: string | null): string {
    const trimmedSourceTitle = sourceTitle?.trim() ?? "";
    if (trimmedSourceTitle.length === 0) {
      return "Forked session";
    }

    return `Fork of ${trimmedSourceTitle}`.slice(0, 50);
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

  private async resolveOpenHumanQuestionsForArchivedSessionInTransaction(
    updatableDatabase: UpdatableDatabase,
    companyId: string,
    sessionId: string,
    resolvedAt: Date,
    userId?: string | null,
  ): Promise<boolean> {
    const updatedInboxItems = await updatableDatabase
      .update(agentInboxItems)
      .set({
        resolvedAt,
        resolvedByUserId: userId ?? null,
        status: "resolved",
        updatedAt: resolvedAt,
      })
      .where(and(
        eq(agentInboxItems.companyId, companyId),
        eq(agentInboxItems.kind, "human_question"),
        eq(agentInboxItems.sessionId, sessionId),
        eq(agentInboxItems.status, "open"),
      ))
      .returning?.({
        id: agentInboxItems.id,
      }) as Array<{ id: string }> | undefined;

    return Array.isArray(updatedInboxItems) && updatedInboxItems.length > 0;
  }

  private async publishSessionHumanQuestionsUpdated(companyId: string, sessionId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionInboxHumanQuestionsUpdateChannel(sessionId));
  }

  private async publishHumanQuestionsUpdate(companyId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.inboxPubSubNames.getHumanQuestionsUpdateChannel());
  }
}
