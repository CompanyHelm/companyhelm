import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { AppRuntimeDatabase } from "../../../../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../../../../db/app_runtime_transaction_provider.ts";
import { agentSessions, agents, companies, modelProviderCredentialModels, modelProviderCredentials } from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { ApiLogger } from "../../../../log/api_logger.ts";
import { CompanySettingsService } from "../../../company_settings_service.ts";
import { RedisCompanyScopedService } from "../../../redis/company_scoped_service.ts";
import { RedisSubscriptionHandle } from "../../../redis/subscription_handle.ts";
import { RedisService } from "../../../redis/service.ts";
import { PiMonoSessionManagerService } from "../pi-mono/session_manager_service.ts";
import type { QueuedSessionMessageRecord } from "./queued_messages.ts";
import { SessionQueuedMessageService } from "./queued_messages.ts";
import { SessionLeaseHandle, SessionLeaseService } from "./lease.ts";
import { SessionProcessPubSubNames } from "./pub_sub_names.ts";
import { SessionProcessQueueService } from "./queue.ts";
import { SessionProcessQueuedNames } from "./queued_names.ts";

type SessionRuntimeRow = {
  agentId: string;
  currentModelProviderCredentialModelId: string;
  currentReasoningLevel: string;
  status: string;
};

type AgentRow = {
  name: string;
  systemPrompt: string | null;
};

type CompanyRow = {
  name: string;
};

type ModelRow = {
  modelId: string;
  modelProviderCredentialId: string;
};

type CredentialRow = {
  encryptedApiKey: string;
  modelProvider: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Owns one wake-job execution pass for a session. Its scope is acquiring the Redis lease, sending
 * exactly one queued turn into PI Mono, handling steer nudges while that turn is active, and
 * re-enqueueing a fresh wake job if Postgres still has queued work after the lease is released.
 */
@injectable()
export class SessionProcessExecutionService {
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly companySettingsService: CompanySettingsService;
  private readonly logger: PinoLogger;
  private readonly piMonoSessionManagerService: PiMonoSessionManagerService;
  private readonly redisService: RedisService;
  private readonly sessionLeaseService: SessionLeaseService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly sessionProcessQueueService: SessionProcessQueueService;
  private readonly sessionProcessQueuedNames: SessionProcessQueuedNames;
  private readonly sessionQueuedMessageService: SessionQueuedMessageService;

  constructor(
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(PiMonoSessionManagerService) piMonoSessionManagerService: PiMonoSessionManagerService,
    @inject(RedisService) redisService: RedisService,
    @inject(SessionLeaseService) sessionLeaseService: SessionLeaseService,
    @inject(SessionProcessQueueService) sessionProcessQueueService: SessionProcessQueueService,
    @inject(SessionProcessQueuedNames)
    sessionProcessQueuedNames: SessionProcessQueuedNames = new SessionProcessQueuedNames(),
    @inject(SessionQueuedMessageService)
    sessionQueuedMessageService: SessionQueuedMessageService = new SessionQueuedMessageService(),
    @inject(SessionProcessPubSubNames)
    sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
    @inject(CompanySettingsService)
    companySettingsService: CompanySettingsService = new CompanySettingsService(),
  ) {
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.companySettingsService = companySettingsService;
    this.logger = logger.child({
      component: "session_process_execution_service",
    });
    this.piMonoSessionManagerService = piMonoSessionManagerService;
    this.redisService = redisService;
    this.sessionLeaseService = sessionLeaseService;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
    this.sessionProcessQueueService = sessionProcessQueueService;
    this.sessionProcessQueuedNames = sessionProcessQueuedNames;
    this.sessionQueuedMessageService = sessionQueuedMessageService;
  }

  async execute(companyId: string, sessionId: string): Promise<void> {
    const lease = await this.sessionLeaseService.acquire(companyId, sessionId);
    if (!lease) {
      await this.enqueueDelayedWakeIfPending(companyId, sessionId);
      this.logger.debug({
        companyId,
        sessionId,
      }, "skipping wake because another worker owns the lease");
      return;
    }

    const transactionProvider = new AppRuntimeTransactionProvider(this.appRuntimeDatabase, companyId);
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    let heartbeatHandle: ReturnType<typeof setInterval> | null = null;
    let interruptError: Error | null = null;
    let interruptSubscription: RedisSubscriptionHandle | null = null;
    let leaseLossError: Error | null = null;
    let shouldEnqueueFollowUpWake = false;
    let steeringSubscription: RedisSubscriptionHandle | null = null;
    let steeringDeliveryPromise = Promise.resolve();

    try {
      const processableMessages = await this.sessionQueuedMessageService.listProcessable(
        transactionProvider,
        companyId,
        sessionId,
      );
      const [primaryQueuedMessage] = processableMessages;
      if (!primaryQueuedMessage) {
        return;
      }

      const runtimeConfig = await this.loadRuntimeConfig(transactionProvider, companyId, sessionId);
      if (!runtimeConfig) {
        await this.clearQueuedMessages(transactionProvider, redisCompanyScopedService, companyId, sessionId);
        return;
      }
      const companySettings = await this.companySettingsService.getSettings(transactionProvider, companyId);
      await this.piMonoSessionManagerService.ensureSession(
        transactionProvider,
        sessionId,
        {
          ...runtimeConfig,
          companyBaseSystemPrompt: companySettings.baseSystemPrompt,
        },
      );

      heartbeatHandle = this.startLeaseHeartbeat(lease, async (error) => {
        leaseLossError = error;
        await this.piMonoSessionManagerService.abort(sessionId);
      });

      steeringSubscription = await redisCompanyScopedService.subscribe(
        this.sessionProcessQueuedNames.getSessionSteerChannel(sessionId),
        () => {
          steeringDeliveryPromise = steeringDeliveryPromise.then(async () => {
            try {
              await this.deliverPendingSteerMessages(transactionProvider, redisCompanyScopedService, companyId, sessionId);
            } catch (error) {
              this.logger.error({
                companyId,
                error,
                sessionId,
              }, "failed to deliver steering messages");
            }
          });
        },
      );
      interruptSubscription = await redisCompanyScopedService.subscribe(
        this.sessionProcessQueuedNames.getSessionInterruptChannel(sessionId),
        () => {
          if (interruptError) {
            return;
          }
          interruptError = new Error("Session interrupted.");
          void this.piMonoSessionManagerService.abort(sessionId);
        },
      );

      const primaryMessageIds = [primaryQueuedMessage.id];
      await this.sessionQueuedMessageService.markProcessing(
        transactionProvider,
        companyId,
        primaryMessageIds,
      );
      await this.publishQueuedMessagesUpdate(redisCompanyScopedService, sessionId);

      try {
        await this.piMonoSessionManagerService.prompt(
          transactionProvider,
          sessionId,
          primaryQueuedMessage.text,
          this.toImageContents(primaryQueuedMessage),
          primaryQueuedMessage.createdAt,
          primaryQueuedMessage.id,
        );
        await steeringDeliveryPromise;
        if (leaseLossError) {
          throw leaseLossError;
        }
        if (interruptError) {
          await this.clearQueuedMessages(transactionProvider, redisCompanyScopedService, companyId, sessionId);
          return;
        }
        // Only brand-new `pending` rows justify a follow-up wake here. Rows still marked
        // `processing` were already claimed by this worker and are handled separately during
        // cleanup so we do not accidentally replay in-flight work.
        shouldEnqueueFollowUpWake = await this.sessionQueuedMessageService.hasPendingMessages(
          transactionProvider,
          companyId,
          sessionId,
        );
      } catch (error) {
        if (interruptError) {
          await this.clearQueuedMessages(transactionProvider, redisCompanyScopedService, companyId, sessionId);
          return;
        }
        await this.sessionQueuedMessageService.markPending(
          transactionProvider,
          companyId,
          primaryMessageIds,
        );
        await this.publishQueuedMessagesUpdate(redisCompanyScopedService, sessionId);
        throw error;
      }
    } finally {
      if (interruptSubscription) {
        await interruptSubscription.unsubscribe();
      }
      if (steeringSubscription) {
        await steeringSubscription.unsubscribe();
      }
      if (heartbeatHandle) {
        clearInterval(heartbeatHandle);
      }

      try {
        const requeuedUndispatchedSteerIds = await this.sessionQueuedMessageService.requeueUndispatchedProcessingSteer?.(
          transactionProvider,
          companyId,
          sessionId,
        ) ?? [];
        if (requeuedUndispatchedSteerIds.length > 0) {
          // These rows were claimed locally but never emitted a PI Mono user `message_start`, so
          // they are safe to move back to `pending` and wake again after the runtime is disposed.
          shouldEnqueueFollowUpWake = true;
          await this.publishQueuedMessagesUpdate(redisCompanyScopedService, sessionId);
        }
      } catch (error) {
        this.logger.error({
          companyId,
          error,
          sessionId,
        }, "failed to requeue undispatched steer messages before disposing the runtime");
      }

      await this.piMonoSessionManagerService.dispose(sessionId);
      await this.sessionLeaseService.release(lease);
      await redisCompanyScopedService.disconnect();

      if (shouldEnqueueFollowUpWake) {
        await this.sessionProcessQueueService.enqueueSessionWake(companyId, sessionId);
      }
    }
  }

  private async deliverPendingSteerMessages(
    transactionProvider: TransactionProviderInterface,
    redisCompanyScopedService: RedisCompanyScopedService,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    while (true) {
      const steerMessages = await this.sessionQueuedMessageService.listPendingSteer(
        transactionProvider,
        companyId,
        sessionId,
      );
      const [steerMessage] = steerMessages;
      if (!steerMessage) {
        return;
      }

      await this.sessionQueuedMessageService.markProcessing(transactionProvider, companyId, [steerMessage.id]);
      await this.publishQueuedMessagesUpdate(redisCompanyScopedService, sessionId);

      try {
        await this.piMonoSessionManagerService.steer(
          transactionProvider,
          sessionId,
          steerMessage.text,
          this.toImageContents(steerMessage),
          steerMessage.createdAt,
          steerMessage.id,
        );
      } catch (error) {
        await this.sessionQueuedMessageService.markPending(transactionProvider, companyId, [steerMessage.id]);
        await this.publishQueuedMessagesUpdate(redisCompanyScopedService, sessionId);
        throw error;
      }
    }
  }

  private async publishQueuedMessagesUpdate(
    redisCompanyScopedService: RedisCompanyScopedService,
    sessionId: string,
  ): Promise<void> {
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionQueuedMessagesUpdateChannel(sessionId));
  }

  private async enqueueDelayedWakeIfPending(
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    const transactionProvider = new AppRuntimeTransactionProvider(this.appRuntimeDatabase, companyId);
    const hasPendingMessages = await this.sessionQueuedMessageService.hasPendingMessages(
      transactionProvider,
      companyId,
      sessionId,
    );
    if (!hasPendingMessages) {
      return;
    }

    await this.sessionProcessQueueService.enqueueSessionWake(companyId, sessionId, {
      delayMilliseconds: SessionLeaseService.LEASE_TTL_MILLISECONDS,
    });
  }

  private async loadRuntimeConfig(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<{
    agentId: string;
    agentName: string;
    agentSystemPrompt: string | null;
    apiKey: string;
    companyId: string;
    companyName: string;
    modelId: string;
    providerId: string;
    reasoningLevel: string;
  } | null> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [sessionRow] = await selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          status: agentSessions.status,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        )) as SessionRuntimeRow[];
      if (!sessionRow) {
        throw new Error("Session not found.");
      }
      if (sessionRow.status === "archived") {
        return null;
      }

      const [agentRow] = await selectableDatabase
        .select({
          name: agents.name,
          systemPrompt: agents.system_prompt,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, sessionRow.agentId),
        )) as AgentRow[];
      if (!agentRow) {
        throw new Error("Session agent not found.");
      }

      const [companyRow] = await selectableDatabase
        .select({
          name: companies.name,
        })
        .from(companies)
        .where(eq(companies.id, companyId)) as CompanyRow[];
      if (!companyRow) {
        throw new Error("Session company not found.");
      }

      const [modelRow] = await selectableDatabase
        .select({
          modelId: modelProviderCredentialModels.modelId,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, companyId),
          eq(modelProviderCredentialModels.id, sessionRow.currentModelProviderCredentialModelId),
        )) as ModelRow[];
      if (!modelRow) {
        throw new Error("Session model not found.");
      }

      const [credentialRow] = await selectableDatabase
        .select({
          encryptedApiKey: modelProviderCredentials.encryptedApiKey,
          modelProvider: modelProviderCredentials.modelProvider,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, modelRow.modelProviderCredentialId),
        )) as CredentialRow[];
      if (!credentialRow) {
        throw new Error("Session credential not found.");
      }

      return {
        agentId: sessionRow.agentId,
        agentName: agentRow.name,
        agentSystemPrompt: agentRow.systemPrompt,
        apiKey: credentialRow.encryptedApiKey,
        companyId,
        companyName: companyRow.name,
        modelId: modelRow.modelId,
        providerId: credentialRow.modelProvider,
        reasoningLevel: sessionRow.currentReasoningLevel,
      };
    });
  }

  private async clearQueuedMessages(
    transactionProvider: TransactionProviderInterface,
    redisCompanyScopedService: RedisCompanyScopedService,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    await this.sessionQueuedMessageService.deleteAllForSession(
      transactionProvider,
      companyId,
      sessionId,
    );
    await this.publishQueuedMessagesUpdate(redisCompanyScopedService, sessionId);
  }

  private toImageContents(queuedMessage: QueuedSessionMessageRecord) {
    return queuedMessage.images.map((image) => ({
      data: image.base64EncodedImage,
      mimeType: image.mimeType,
      type: "image" as const,
    }));
  }

  private startLeaseHeartbeat(
    lease: SessionLeaseHandle,
    onLeaseLost: (error: Error) => Promise<void>,
  ): ReturnType<typeof setInterval> {
    let isHeartbeatRunning = false;

    return setInterval(() => {
      if (isHeartbeatRunning) {
        return;
      }

      isHeartbeatRunning = true;
      void this.sessionLeaseService.heartbeat(lease).then(async (hasLease) => {
        if (hasLease) {
          return;
        }

        await onLeaseLost(new Error("Lost session lease while processing the turn."));
      }).catch(async (error) => {
        await onLeaseLost(error instanceof Error ? error : new Error("Failed to heartbeat session lease."));
      }).finally(() => {
        isHeartbeatRunning = false;
      });
    }, Math.floor(SessionLeaseService.LEASE_TTL_MILLISECONDS / 3));
  }
}
