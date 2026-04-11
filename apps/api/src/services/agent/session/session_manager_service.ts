import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { ApiLogger } from "../../../log/api_logger.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import type { QueuedSessionMessageRecord } from "./process/queued_messages.ts";
import type {
  InsertableDatabase,
  SelectableDatabase,
  SessionManagerCreateSessionOptions,
  SessionManagerQueuePromptOptions,
  SessionPromptImageInput,
  SessionRecord,
  UpdatableDatabase,
} from "./session_manager_service_types.ts";
import { SessionLifecycleService } from "./session_lifecycle_service.ts";
import { SessionPromptService } from "./session_prompt_service.ts";

export type { SessionPromptImageInput } from "./session_manager_service_types.ts";

/**
 * Preserves the public session-mutation surface used by GraphQL mutations and internal services
 * while delegating the real work to narrower lifecycle and prompt collaborators. This keeps the
 * current entrypoints stable without forcing every caller to switch dependencies in the same
 * refactor.
 */
@injectable()
export class SessionManagerService {
  private readonly logger: PinoLogger;
  private readonly sessionLifecycleService: SessionLifecycleService;
  private readonly sessionPromptService: SessionPromptService;

  constructor(
    @inject(ApiLogger) logger: ApiLogger,
    @inject(SessionLifecycleService) sessionLifecycleService: SessionLifecycleService,
    @inject(SessionPromptService) sessionPromptService: SessionPromptService,
  ) {
    this.logger = logger.child({
      component: "session_manager_service",
    });
    this.sessionLifecycleService = sessionLifecycleService;
    this.sessionPromptService = sessionPromptService;
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
    const sessionRecord = await this.sessionLifecycleService.createSession(
      transactionProvider,
      companyId,
      agentId,
      userMessage,
      modelProviderCredentialModelId,
      reasoningLevel,
      sessionId,
      userId,
      images,
    );

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
    return this.sessionLifecycleService.createSessionInTransaction(
      selectableDatabase,
      insertableDatabase,
      companyId,
      agentId,
      userMessage,
      options,
    );
  }

  async archiveSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<SessionRecord> {
    const sessionRecord = await this.sessionLifecycleService.archiveSession(
      transactionProvider,
      companyId,
      sessionId,
      userId,
    );

    this.logger.info({
      companyId,
      sessionId,
    }, "archived agent session");

    return sessionRecord;
  }

  async forkSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    forkedFromTurnId: string,
    userId?: string | null,
  ): Promise<SessionRecord> {
    const sessionRecord = await this.sessionLifecycleService.forkSession(
      transactionProvider,
      companyId,
      sessionId,
      forkedFromTurnId,
      userId,
    );

    this.logger.info({
      checkpointSessionId: sessionId,
      companyId,
      forkedFromTurnId,
      sessionId: sessionRecord.id,
      sourceSessionId: sessionId,
    }, "forked agent session");

    return sessionRecord;
  }

  async interruptSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<void> {
    const wasInterrupted = await this.sessionLifecycleService.interruptSession(
      transactionProvider,
      companyId,
      sessionId,
      userId,
    );

    if (wasInterrupted) {
      this.logger.info({
        companyId,
        sessionId,
      }, "interrupted agent session");
    }
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
    const sessionRecord = await this.sessionPromptService.prompt(
      transactionProvider,
      companyId,
      sessionId,
      userMessage,
      modelProviderCredentialModelId,
      reasoningLevel,
      shouldSteer,
      images,
      userId,
    );

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
    userId?: string | null,
  ): Promise<SessionRecord> {
    const sessionRecord = await this.sessionLifecycleService.updateSessionTitle(
      transactionProvider,
      companyId,
      sessionId,
      title,
      userId,
    );

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
    return this.sessionPromptService.queuePromptInTransaction(
      selectableDatabase,
      insertableDatabase,
      updatableDatabase,
      companyId,
      sessionId,
      userMessage,
      options,
    );
  }

  async steerQueuedMessage(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    queuedMessageId: string,
  ): Promise<QueuedSessionMessageRecord> {
    const queuedMessage = await this.sessionPromptService.steerQueuedMessage(
      transactionProvider,
      companyId,
      queuedMessageId,
    );

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
    const queuedMessage = await this.sessionPromptService.deleteQueuedMessage(
      transactionProvider,
      companyId,
      queuedMessageId,
    );

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
    await this.sessionPromptService.notifyQueuedSessionMessage(
      companyId,
      sessionId,
      shouldSteer,
    );
  }
}
