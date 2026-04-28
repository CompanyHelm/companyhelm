import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { AppRuntimeDatabase } from "../../../../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../../../../db/app_runtime_transaction_provider.ts";
import {
  agentSessions,
  agents,
  companies,
  modelProviderCredentialModels,
  modelProviderCredentials,
  platformModelProviderCredentialModels,
  platformModelProviderCredentials,
  users,
} from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { ApiLogger } from "../../../../log/api_logger.ts";
import { CompanySettingsService } from "../../../company_settings_service.ts";
import { RedisCompanyScopedService } from "../../../redis/company_scoped_service.ts";
import { RedisSubscriptionHandle } from "../../../redis/subscription_handle.ts";
import { RedisService } from "../../../redis/service.ts";
import { PiMonoSessionManagerService } from "../pi-mono/session_manager_service.ts";
import type { AgentSessionRuntimeContext } from "../pi-mono/runtime_context.ts";
import type { QueuedSessionMessageRecord } from "./queued_messages.ts";
import { SessionQueuedMessageService } from "./queued_messages.ts";
import { SessionLeaseHandle, SessionLeaseService } from "./lease.ts";
import { SessionProcessPubSubNames } from "./pub_sub_names.ts";
import { SessionProcessQueueService } from "./queue.ts";
import { SessionProcessQueuedNames } from "./queued_names.ts";
import { CompanyHelmLlmProviderService } from "../../../ai_providers/companyhelm_service.ts";
import { CompanyManagedLlmBudgetService } from "../../../ai_providers/company_managed_llm_budget_service.ts";
import { EnhancedLoggingService } from "../../../../log/enhanced_logging_service.ts";

type SessionRuntimeRow = {
  agentId: string;
  currentModelCredentialSource: "platform" | "user_provided";
  currentPlatformModelProviderCredentialModelId: string | null;
  currentModelProviderCredentialModelId: string | null;
  currentReasoningLevel: string;
  ownerUserId: string | null;
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
  modelProviderCredentialId: string | null;
  platformModelProviderCredentialId: string | null;
  name?: string;
  reasoningSupported?: boolean;
};

type CredentialRow = {
  baseUrl: string | null;
  encryptedApiKey: string;
  modelProvider: string;
};

type SessionStatusRow = {
  status: string;
};

type UserRow = {
  firstName: string;
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
  private readonly companyHelmLlmProviderService?: CompanyHelmLlmProviderService;
  private readonly companyManagedLlmBudgetService: CompanyManagedLlmBudgetService;
  private readonly companySettingsService: CompanySettingsService;
  private readonly logger: PinoLogger;
  private readonly piMonoSessionManagerService: PiMonoSessionManagerService;
  private readonly redisService: RedisService;
  private readonly sessionLeaseService: SessionLeaseService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly sessionProcessQueueService: SessionProcessQueueService;
  private readonly sessionProcessQueuedNames: SessionProcessQueuedNames;
  private readonly sessionQueuedMessageService: SessionQueuedMessageService;
  private readonly enhancedLoggingService: EnhancedLoggingService;

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
    @inject(CompanyHelmLlmProviderService)
    companyHelmLlmProviderService?: CompanyHelmLlmProviderService,
    @inject(CompanyManagedLlmBudgetService)
    companyManagedLlmBudgetService: CompanyManagedLlmBudgetService = new CompanyManagedLlmBudgetService(),
    @inject(EnhancedLoggingService)
    enhancedLoggingService: EnhancedLoggingService = new EnhancedLoggingService(),
  ) {
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.companyHelmLlmProviderService = companyHelmLlmProviderService;
    this.companyManagedLlmBudgetService = companyManagedLlmBudgetService;
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
    this.enhancedLoggingService = enhancedLoggingService;
  }

  async execute(companyId: string, sessionId: string): Promise<void> {
    const wakeRunId = randomUUID();
    const wakeStartedAtMilliseconds = Date.now();
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
    let runtime: AgentSessionRuntimeContext | null = null;
    let shouldEnqueueFollowUpWake = false;
    let interruptDeliveryPromise = Promise.resolve();
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
      if (runtimeConfig.isCompanyHelmManagedCredential) {
        const budgetStatus = await this.companyManagedLlmBudgetService.checkWithinBudget(transactionProvider, {
          companyId,
          modelProviderCredentialId: runtimeConfig.modelProviderCredentialId,
        });
        if (!budgetStatus.allowed) {
          this.logger.info({
            companyId,
            limitCostNanoUsd: budgetStatus.limitCostNanoUsd,
            period: budgetStatus.period,
            sessionId,
            usedCostNanoUsd: budgetStatus.usedCostNanoUsd,
          }, "clearing queued session work because CompanyHelm managed LLM budget is exhausted");
          await this.clearQueuedMessages(transactionProvider, redisCompanyScopedService, companyId, sessionId);
          return;
        }
      }
      const companySettings = await this.companySettingsService.getSettings(transactionProvider, companyId);
      runtime = await this.piMonoSessionManagerService.createRuntime(
        transactionProvider,
        sessionId,
        {
          ...runtimeConfig,
          companyBaseSystemPrompt: companySettings.baseSystemPrompt,
        },
      );

      heartbeatHandle = this.startLeaseHeartbeat(lease, async (error) => {
        leaseLossError = error;
        if (runtime) {
          await this.piMonoSessionManagerService.abort(runtime);
        }
      });

      steeringSubscription = await redisCompanyScopedService.subscribe(
        this.sessionProcessQueuedNames.getSessionSteerChannel(sessionId),
        () => {
          steeringDeliveryPromise = steeringDeliveryPromise.then(async () => {
            try {
              if (!runtime) {
                return;
              }
              await this.deliverPendingSteerMessages(
                runtime,
                transactionProvider,
                redisCompanyScopedService,
                companyId,
                sessionId,
              );
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
          if (runtime) {
            const interruptedRuntime = runtime;
            interruptDeliveryPromise = interruptDeliveryPromise.then(async () => {
              await this.persistInterruptedRuntimeContext(
                interruptedRuntime,
                transactionProvider,
                companyId,
                sessionId,
              );
              try {
                await this.piMonoSessionManagerService.abort(interruptedRuntime);
              } catch (error) {
                this.logger.error({
                  companyId,
                  error,
                  sessionId,
                }, "failed to abort interrupted session runtime");
              }
            });
          }
        },
      );
      if (!await this.isSessionProcessable(transactionProvider, companyId, sessionId)) {
        await this.clearQueuedMessages(transactionProvider, redisCompanyScopedService, companyId, sessionId);
        return;
      }
      if (interruptError) {
        await interruptDeliveryPromise;
        await this.clearQueuedMessages(transactionProvider, redisCompanyScopedService, companyId, sessionId);
        return;
      }

      const primaryMessageIds = [primaryQueuedMessage.id];
      await this.sessionQueuedMessageService.markProcessing(
        transactionProvider,
        companyId,
        primaryMessageIds,
      );
      await this.publishQueuedMessagesUpdate(redisCompanyScopedService, sessionId);
      if (interruptError) {
        await interruptDeliveryPromise;
        await this.clearQueuedMessages(transactionProvider, redisCompanyScopedService, companyId, sessionId);
        return;
      }

      try {
        await this.piMonoSessionManagerService.prompt(
          runtime,
          transactionProvider,
          sessionId,
          primaryQueuedMessage.text,
          this.toImageContents(primaryQueuedMessage),
          primaryQueuedMessage.createdAt,
          primaryQueuedMessage.id,
          this.toPrincipalMetadata(primaryQueuedMessage),
        );
        await steeringDeliveryPromise;
        if (leaseLossError) {
          throw leaseLossError;
        }
        if (interruptError) {
          await interruptDeliveryPromise;
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
          await interruptDeliveryPromise;
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
      const finalizeStartedAtMilliseconds = Date.now();
      this.logEnhanced(companyId, sessionId, "session_process_cleanup", "session_process_finalize_start", {
        sinceWakeStartMs: finalizeStartedAtMilliseconds - wakeStartedAtMilliseconds,
        wakeRunId,
      });
      if (interruptSubscription) {
        await interruptSubscription.unsubscribe();
      }
      if (steeringSubscription) {
        await steeringSubscription.unsubscribe();
      }
      if (heartbeatHandle) {
        clearInterval(heartbeatHandle);
      }
      await interruptDeliveryPromise;

      try {
        const requeueStartedAtMilliseconds = Date.now();
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
        this.logEnhanced(companyId, sessionId, "session_process_cleanup", "session_process_requeue_undispatched_steers_end", {
          durationMs: Date.now() - requeueStartedAtMilliseconds,
          requeuedCount: requeuedUndispatchedSteerIds.length,
          sinceWakeStartMs: Date.now() - wakeStartedAtMilliseconds,
          wakeRunId,
        });
      } catch (error) {
        this.logger.error({
          companyId,
          error,
          sessionId,
        }, "failed to requeue undispatched steer messages before disposing the runtime");
      }

      try {
        if (runtime) {
          const disposeStartedAtMilliseconds = Date.now();
          this.logEnhanced(companyId, sessionId, "session_process_cleanup", "session_process_dispose_runtime_start", {
            sinceWakeStartMs: disposeStartedAtMilliseconds - wakeStartedAtMilliseconds,
            wakeRunId,
          });
          await this.piMonoSessionManagerService.disposeRuntime(runtime);
          this.logEnhanced(companyId, sessionId, "session_process_cleanup", "session_process_dispose_runtime_end", {
            durationMs: Date.now() - disposeStartedAtMilliseconds,
            sinceWakeStartMs: Date.now() - wakeStartedAtMilliseconds,
            wakeRunId,
          });
        }
      } finally {
        try {
          const releaseStartedAtMilliseconds = Date.now();
          this.logEnhanced(companyId, sessionId, "session_process_cleanup", "session_process_release_lease_start", {
            sinceWakeStartMs: releaseStartedAtMilliseconds - wakeStartedAtMilliseconds,
            wakeRunId,
          });
          await this.sessionLeaseService.release(lease);
          this.logEnhanced(companyId, sessionId, "session_process_cleanup", "session_process_release_lease_end", {
            durationMs: Date.now() - releaseStartedAtMilliseconds,
            sinceWakeStartMs: Date.now() - wakeStartedAtMilliseconds,
            wakeRunId,
          });
        } finally {
          const disconnectStartedAtMilliseconds = Date.now();
          await redisCompanyScopedService.disconnect();
          this.logEnhanced(companyId, sessionId, "session_process_cleanup", "session_process_disconnect_redis_end", {
            durationMs: Date.now() - disconnectStartedAtMilliseconds,
            sinceWakeStartMs: Date.now() - wakeStartedAtMilliseconds,
            wakeRunId,
          });
        }
      }

      if (shouldEnqueueFollowUpWake) {
        const followUpWakeStartedAtMilliseconds = Date.now();
        await this.sessionProcessQueueService.enqueueSessionWake(companyId, sessionId);
        this.logEnhanced(companyId, sessionId, "session_process_cleanup", "session_process_follow_up_wake_end", {
          durationMs: Date.now() - followUpWakeStartedAtMilliseconds,
          sinceWakeStartMs: Date.now() - wakeStartedAtMilliseconds,
          wakeRunId,
        });
      }

      this.logEnhanced(companyId, sessionId, "session_process_cleanup", "session_process_finalize_end", {
        durationMs: Date.now() - finalizeStartedAtMilliseconds,
        sinceWakeStartMs: Date.now() - wakeStartedAtMilliseconds,
        wakeRunId,
      });
    }
  }

  private logEnhanced(
    companyId: string,
    sessionId: string,
    diagnosticComponent: string,
    diagnosticEvent: string,
    fields: Record<string, unknown>,
  ): void {
    if (!this.enhancedLoggingService.shouldLogEnhanced(companyId, diagnosticComponent, sessionId)) {
      return;
    }

    this.logger.info({
      ...fields,
      companyId,
      diagnostic: "enhanced",
      diagnosticComponent,
      diagnosticEvent,
      sessionId,
    }, "enhanced diagnostic log");
  }

  private async persistInterruptedRuntimeContext(
    runtime: AgentSessionRuntimeContext,
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    try {
      await this.piMonoSessionManagerService.recordInterruptedUsage(runtime);
    } catch (error) {
      this.logger.error({
        companyId,
        error,
        sessionId,
      }, "failed to persist interrupted session usage");
    }

    try {
      await this.piMonoSessionManagerService.persistRuntimeContextSnapshot(
        runtime,
        transactionProvider,
        sessionId,
      );
    } catch (error) {
      this.logger.error({
        companyId,
        error,
        sessionId,
      }, "failed to persist interrupted session runtime context");
    }
  }

  private async deliverPendingSteerMessages(
    runtime: AgentSessionRuntimeContext,
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
          runtime,
          transactionProvider,
          sessionId,
          steerMessage.text,
          this.toImageContents(steerMessage),
          steerMessage.createdAt,
          steerMessage.id,
          this.toPrincipalMetadata(steerMessage),
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
    baseUrl?: string | null;
    companyId: string;
    companyName: string;
    isCompanyHelmManagedCredential: boolean;
    modelId: string;
    modelName?: string | null;
    modelProviderCredentialId: string;
    providerId: string;
    reasoningSupported?: boolean | null;
    reasoningLevel: string;
    userFirstName?: string;
  } | null> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [sessionRow] = await selectableDatabase
        .select({
          agentId: agentSessions.agentId,
          currentModelCredentialSource: agentSessions.currentModelCredentialSource,
          currentPlatformModelProviderCredentialModelId: agentSessions.currentPlatformModelProviderCredentialModelId,
          currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          ownerUserId: agentSessions.ownerUserId,
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
      if (!this.isProcessableStatus(sessionRow.status)) {
        return null;
      }

      const userFirstName = await this.loadUserFirstName(selectableDatabase, sessionRow.ownerUserId);

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

      const [modelRow] = sessionRow.currentModelCredentialSource === "platform"
        ? await selectableDatabase
          .select({
            modelId: platformModelProviderCredentialModels.modelId,
            platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
            name: platformModelProviderCredentialModels.name,
            reasoningSupported: platformModelProviderCredentialModels.reasoningSupported,
          })
          .from(platformModelProviderCredentialModels)
          .where(eq(platformModelProviderCredentialModels.id, sessionRow.currentPlatformModelProviderCredentialModelId ?? "")) as ModelRow[]
        : await selectableDatabase
          .select({
            modelId: modelProviderCredentialModels.modelId,
            modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
            name: modelProviderCredentialModels.name,
            reasoningSupported: modelProviderCredentialModels.reasoningSupported,
          })
          .from(modelProviderCredentialModels)
          .where(and(
            eq(modelProviderCredentialModels.companyId, companyId),
            eq(modelProviderCredentialModels.id, sessionRow.currentModelProviderCredentialModelId ?? ""),
          )) as ModelRow[];
      if (!modelRow) {
        throw new Error("Session model not found.");
      }

      const [credentialRow] = sessionRow.currentModelCredentialSource === "platform"
        ? await selectableDatabase
          .select({
            baseUrl: platformModelProviderCredentials.baseUrl,
            encryptedApiKey: platformModelProviderCredentials.encryptedApiKey,
            modelProvider: platformModelProviderCredentials.modelProvider,
          })
          .from(platformModelProviderCredentials)
          .where(eq(platformModelProviderCredentials.id, modelRow.platformModelProviderCredentialId ?? "")) as CredentialRow[]
        : await selectableDatabase
          .select({
            baseUrl: modelProviderCredentials.baseUrl,
            encryptedApiKey: modelProviderCredentials.encryptedApiKey,
            modelProvider: modelProviderCredentials.modelProvider,
          })
          .from(modelProviderCredentials)
          .where(and(
            eq(modelProviderCredentials.companyId, companyId),
            eq(modelProviderCredentials.id, modelRow.modelProviderCredentialId ?? ""),
          )) as CredentialRow[];
      if (!credentialRow) {
        throw new Error("Session credential not found.");
      }
      const resolvedCredentialId = modelRow.platformModelProviderCredentialId ?? modelRow.modelProviderCredentialId;

      return {
        agentId: sessionRow.agentId,
        agentName: agentRow.name,
        agentSystemPrompt: agentRow.systemPrompt,
        apiKey: this.resolveRuntimeApiKey(credentialRow),
        ...(credentialRow.baseUrl ? { baseUrl: credentialRow.baseUrl } : {}),
        companyId,
        companyName: companyRow.name,
        isCompanyHelmManagedCredential: sessionRow.currentModelCredentialSource === "platform",
        modelId: modelRow.modelId,
        ...(modelRow.name ? { modelName: modelRow.name } : {}),
        modelProviderCredentialId: resolvedCredentialId ?? "",
        providerId: this.resolveRuntimeProviderId(credentialRow),
        ...(typeof modelRow.reasoningSupported === "boolean" ? { reasoningSupported: modelRow.reasoningSupported } : {}),
        reasoningLevel: sessionRow.currentReasoningLevel,
        ...(userFirstName ? { userFirstName } : {}),
      };
    });
  }

  private async loadUserFirstName(selectableDatabase: SelectableDatabase, ownerUserId: string | null): Promise<string | null> {
    if (!ownerUserId) {
      return null;
    }

    const [userRow] = await selectableDatabase
      .select({
        firstName: users.first_name,
      })
      .from(users)
      .where(eq(users.id, ownerUserId)) as UserRow[];
    if (!userRow) {
      throw new Error("Session owner user not found.");
    }

    return userRow.firstName;
  }

  private async isSessionProcessable(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<boolean> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [sessionRow] = await selectableDatabase
        .select({
          status: agentSessions.status,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        )) as SessionStatusRow[];

      return Boolean(sessionRow && this.isProcessableStatus(sessionRow.status));
    });
  }

  private isProcessableStatus(status: string): boolean {
    return status === "queued" || status === "running";
  }

  private resolveRuntimeApiKey(credentialRow: CredentialRow): string {
    if (credentialRow.modelProvider === CompanyHelmLlmProviderService.PROVIDER_ID) {
      if (!this.companyHelmLlmProviderService) {
        throw new Error("CompanyHelm model provider service is not configured.");
      }

      return this.companyHelmLlmProviderService.getRuntimeApiKey();
    }

    return credentialRow.encryptedApiKey;
  }

  private resolveRuntimeProviderId(credentialRow: CredentialRow): string {
    if (credentialRow.modelProvider === CompanyHelmLlmProviderService.PROVIDER_ID) {
      if (!this.companyHelmLlmProviderService) {
        throw new Error("CompanyHelm model provider service is not configured.");
      }

      return this.companyHelmLlmProviderService.getRuntimeModelProvider();
    }

    return credentialRow.modelProvider;
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

  private toPrincipalMetadata(
    queuedMessage: QueuedSessionMessageRecord,
  ): {
    principalAgentId: string | null;
    principalSessionId: string | null;
    principalType: "agent_message" | "github_webhook" | "task" | "user" | "workflow";
    taskRunId: string | null;
    workflowRunId: string | null;
  } {
    return {
      principalAgentId: queuedMessage.principalAgentId,
      principalSessionId: queuedMessage.principalSessionId,
      principalType: queuedMessage.principalType,
      taskRunId: queuedMessage.taskRunId,
      workflowRunId: queuedMessage.workflowRunId,
    };
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
