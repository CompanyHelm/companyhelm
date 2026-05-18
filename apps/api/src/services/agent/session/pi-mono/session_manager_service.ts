import { inject, injectable } from "inversify";
import { eq } from "drizzle-orm";
import type { AgentMessage, ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { ImageContent } from "@mariozechner/pi-ai";
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  ModelRegistry as PiMonoModelRegistry,
  SettingsManager,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { agentSessions } from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { GithubClient } from "../../../../github/client.ts";
import { AgentEnvironmentAccessService } from "../../../environments/access_service.ts";
import { AgentEnvironmentPromptScope } from "../../../environments/prompt_scope.ts";
import { SecretService } from "../../../secrets/service.ts";
import { AgentToolsService } from "./tools/service.ts";
import { AgentConversationService } from "../../../conversations/service.ts";
import { AgentEnvironmentTemplateService } from "../../../environments/template_service.ts";
import { AgentInboxService } from "../../../inbox/service.ts";
import { ModelRegistry } from "../../../ai_providers/model_registry.ts";
import { ModelProviderService } from "../../../ai_providers/model_provider_service.ts";
import { OpenRouterCatalogService } from "../../../ai_providers/openrouter_catalog_service.js";
import { ApiLogger } from "../../../../log/api_logger.ts";
import { RedisService } from "../../../redis/service.ts";
import { AgentEnvironmentWorkspacePath } from "../../../environments/workspace_path.ts";
import { CompanyHelmResourceLoader } from "./companyhelm_resource_loader.ts";
import { PiMonoSessionEventHandler } from "./session_event_handler.ts";
import { ComputeProviderDefinitionService } from "../../../compute_provider_definitions/service.ts";
import { ExaWebClient } from "../../../web_search/exa_client.ts";
import { AgentSessionBootstrapContext } from "./bootstrap_context.ts";
import { DefaultAgentSessionModuleRegistry } from "./modules/default_registry.ts";
import { AgentSessionRuntimeContext } from "./runtime_context.ts";
import { Config } from "../../../../config/schema.ts";
import { McpService } from "../../../mcp/service.ts";
import { WorkflowService } from "../../../workflows/service.ts";
import { EnhancedLoggingService } from "../../../../log/enhanced_logging_service.ts";
import { type SessionPipelineLogContext, SessionPipelineLogger } from "../../../../log/session_pipeline_logger.ts";
import { SessionTurnUsageQueueService } from "../session_turn_usage_queue.ts";
import { SessionTurnUsageService } from "../session_turn_usage_service.ts";
import { PiMonoCompactionSettingsManagerFactory } from "./compaction_settings_manager_factory.ts";

type SessionRuntimeConfig = {
  agentId: string;
  agentName: string;
  agentSystemPrompt?: string | null;
  apiKey: string;
  autoCompactPercent?: number | null;
  baseUrl?: string | null;
  companyBaseSystemPrompt?: string | null;
  companyId: string;
  companyName: string;
  modelId: string;
  modelName?: string | null;
  providerId: string;
  reasoningSupported?: boolean | null;
  reasoningLevel?: string | null;
  userFirstName?: string | null;
};

const DEFAULT_PI_WORKING_DIRECTORY = AgentEnvironmentWorkspacePath.get();

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<void>;
    };
  };
};

type StoredContextMessagesSnapshot = {
  contextMessagesSnapshot: AgentMessage[];
  contextMessagesSnapshotAt: Date | null;
};

/**
 * Builds PI Mono runtime sessions for a single leased wake. Its scope is creating the SDK runtime,
 * restoring persisted context into it, and giving prompt or steer calls access to the paired event
 * handler that writes transcript rows.
 */
@injectable()
export class PiMonoSessionManagerService {
  private readonly agentEnvironmentAccessService: AgentEnvironmentAccessService;
  private readonly config: Config;
  private readonly githubClient: GithubClient;
  private readonly inboxService: AgentInboxService;
  private readonly logger: SessionPipelineLogger;
  private readonly redisService: RedisService;
  private readonly secretService: SecretService;
  private readonly agentConversationService: AgentConversationService;
  private readonly exaWebClient: ExaWebClient;
  private readonly templateService: AgentEnvironmentTemplateService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly modelProviderService: ModelProviderService;
  private readonly openRouterCatalogService: OpenRouterCatalogService;
  private readonly appModelRegistry: ModelRegistry;
  private readonly mcpService: McpService;
  private readonly sessionTurnUsageService: SessionTurnUsageService;
  private readonly workflowService: WorkflowService;
  private readonly enhancedLoggingService: EnhancedLoggingService;
  private readonly compactionSettingsManagerFactory: PiMonoCompactionSettingsManagerFactory;

  constructor(
    @inject(Config) config: Config,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(RedisService) redisService: RedisService,
    @inject(AgentEnvironmentAccessService) agentEnvironmentAccessService: AgentEnvironmentAccessService,
    @inject(GithubClient) githubClient: GithubClient,
    @inject(AgentInboxService) inboxService: AgentInboxService,
    @inject(SecretService) secretService: SecretService,
    @inject(AgentConversationService) agentConversationService: AgentConversationService,
    @inject(ExaWebClient) exaWebClient: ExaWebClient,
    @inject(AgentEnvironmentTemplateService)
    templateService: AgentEnvironmentTemplateService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
    @inject(ModelProviderService) modelProviderService: ModelProviderService,
    @inject(OpenRouterCatalogService)
    openRouterCatalogService: OpenRouterCatalogService = new OpenRouterCatalogService(),
    @inject(ModelRegistry) appModelRegistry: ModelRegistry,
    @inject(McpService)
    mcpService: McpService = new McpService(),
    @inject(WorkflowService)
    workflowService: WorkflowService = {
      async listWorkflows() {
        throw new Error("workflow definitions should not be loaded during createRuntime");
      },
      async startLocalWorkflowRun() {
        throw new Error("local workflow runs should not be started during createRuntime");
      },
      async startWorkflowRun() {
        throw new Error("workflow runs should not be started during createRuntime");
      },
    } as never,
    @inject(EnhancedLoggingService)
    enhancedLoggingService: EnhancedLoggingService = new EnhancedLoggingService(),
    @inject(SessionTurnUsageQueueService)
    sessionTurnUsageQueueService: SessionTurnUsageQueueService = null as never,
    @inject(PiMonoCompactionSettingsManagerFactory)
    compactionSettingsManagerFactory: PiMonoCompactionSettingsManagerFactory =
      new PiMonoCompactionSettingsManagerFactory(),
  ) {
    this.config = config;
    this.logger = new SessionPipelineLogger(logger.child({
      component: "pi_mono_session_manager_service",
    }));
    this.redisService = redisService;
    this.agentEnvironmentAccessService = agentEnvironmentAccessService;
    this.githubClient = githubClient;
    this.inboxService = inboxService;
    this.secretService = secretService;
    this.agentConversationService = agentConversationService;
    this.exaWebClient = exaWebClient;
    this.templateService = templateService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.modelProviderService = modelProviderService;
    this.openRouterCatalogService = openRouterCatalogService;
    this.appModelRegistry = appModelRegistry;
    this.mcpService = mcpService;
    this.sessionTurnUsageService = new SessionTurnUsageService(
      undefined,
      sessionTurnUsageQueueService,
      logger.child({ component: "session_turn_usage_service" }),
    );
    this.workflowService = workflowService;
    this.enhancedLoggingService = enhancedLoggingService;
    this.compactionSettingsManagerFactory = compactionSettingsManagerFactory;
  }

  async createRuntime(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    runtimeConfig: SessionRuntimeConfig,
    logContext: SessionPipelineLogContext = {},
  ): Promise<AgentSessionRuntimeContext> {
    const bootstrapContext = await this.createBootstrapContext(
      transactionProvider,
      sessionId,
      runtimeConfig,
    );
    const authStorage = AuthStorage.inMemory();
    authStorage.setRuntimeApiKey(bootstrapContext.modelProviderId, bootstrapContext.modelApiKey);
    const modelRegistry = PiMonoModelRegistry.inMemory(authStorage);
    if (bootstrapContext.modelProviderId === "openrouter") {
      await this.configureOpenRouterProvider(bootstrapContext.modelApiKey, modelRegistry);
    }
    if (bootstrapContext.modelProviderId === "openai-compatible") {
      this.configureOpenAiCompatibleProvider(runtimeConfig, modelRegistry);
    }
    const runtimeLogger = this.logger.child({
      agentId: runtimeConfig.agentId,
      companyId: runtimeConfig.companyId,
      session_id: sessionId,
      trace_id: logContext.trace_id,
      worker_id: logContext.worker_id,
    });
    const sessionModuleRegistry = new DefaultAgentSessionModuleRegistry({
      agentConversationService: this.agentConversationService,
      config: this.config,
      computeProviderDefinitionService: this.computeProviderDefinitionService,
      exaWebClient: this.exaWebClient,
      githubClient: this.githubClient,
      inboxService: this.inboxService,
      logger: runtimeLogger,
      mcpService: this.mcpService,
      modelProviderService: this.modelProviderService,
      modelRegistry: this.appModelRegistry,
      secretService: this.secretService,
      templateService: this.templateService,
      workflowService: this.workflowService,
    });
    const sessionModuleResolution = await sessionModuleRegistry.resolve(bootstrapContext);
    const agentToolsService = new AgentToolsService(
      bootstrapContext.promptScope,
      sessionModuleResolution.toolProviders,
    );
    const model = modelRegistry.find(bootstrapContext.modelProviderId, bootstrapContext.modelId);
    if (!model) {
      throw new Error(`Model not found for provider "${bootstrapContext.modelProviderId}": ${bootstrapContext.modelId}`);
    }

    const sessionManager = SessionManager.inMemory();
    sessionManager.newSession({
      id: sessionId,
    });
    const storedContextMessagesSnapshot = await this.loadStoredContextMessagesSnapshot(transactionProvider, sessionId);
    for (const message of storedContextMessagesSnapshot.contextMessagesSnapshot) {
      // PI Mono restores initial agent state from the SessionManager history.
      sessionManager.appendMessage(message as Parameters<typeof sessionManager.appendMessage>[0]);
    }
    const resourceLoader = new CompanyHelmResourceLoader(
      bootstrapContext.toSystemPromptTemplateContext(),
      sessionModuleResolution.appendSystemPrompts,
    );
    await resourceLoader.reload();

    const initializedTools = agentToolsService.initializeTools();
    const settingsManager = this.createSettingsManager(runtimeConfig, model);
    const { session } = await createAgentSession({
      authStorage,
      modelRegistry,
      sessionManager,
      settingsManager,
      cwd: DEFAULT_PI_WORKING_DIRECTORY,
      model,
      resourceLoader,
      // Disable PI's default built-in tools while keeping CompanyHelm custom tools registered.
      // Passing `tools: []` would create an empty allowlist and filter out custom tools too.
      noTools: "builtin",
      customTools: initializedTools,
      thinkingLevel: this.resolveThinkingLevel(bootstrapContext.reasoningLevel),
    });
    session.setActiveToolsByName(initializedTools.map((tool) => tool.name));
    const sessionEventHandler = new PiMonoSessionEventHandler(
      transactionProvider,
      sessionId,
      this.redisService,
      {
        contextMessagesSnapshotProvider: () => session.agent.state.messages,
        contextSnapshotProvider: () => this.buildContextSnapshot(session),
        enhancedLoggingService: this.enhancedLoggingService,
        initialContextMessagesSnapshotAt: storedContextMessagesSnapshot.contextMessagesSnapshotAt,
        logger: runtimeLogger,
        sessionTurnUsageService: this.sessionTurnUsageService,
      },
    );

    session.subscribe((event) => {
      void sessionEventHandler.handle(event);
    });

    return new AgentSessionRuntimeContext({
      bootstrapContext,
      eventHandler: sessionEventHandler,
      logger: runtimeLogger,
      session,
      toolsService: agentToolsService,
    });
  }

  async prompt(
    runtime: AgentSessionRuntimeContext,
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    message: string,
    images?: ImageContent[],
    userMessageCreatedAt?: Date,
    queuedMessageId?: string,
    principalMetadata?: {
      principalAgentId: string | null;
      principalSessionId: string | null;
      principalType: "agent_message" | "github_webhook" | "schedule" | "task" | "user" | "workflow";
      taskRunId: string | null;
      workflowRunId: string | null;
    },
  ): Promise<void> {
    if (userMessageCreatedAt) {
      runtime.eventHandler.queueUserMessageTimestamp(userMessageCreatedAt, queuedMessageId, principalMetadata);
    }

    const session = runtime.session;
    const turnId = await runtime.eventHandler.startPromptTurn(new Date());
    const runtimeLogger = runtime.logger.child({
      turn_id: turnId,
    });
    let completedTurnAt: Date;
    try {
      const promptStartedAtMilliseconds = Date.now();
      await session.prompt(message, images && images.length > 0 ? { images } : undefined);
      this.logEnhanced(runtimeLogger, runtime.getCompanyId(), sessionId, "session_prompt_tail", "session_prompt_call_end", {
        durationMs: Date.now() - promptStartedAtMilliseconds,
        pendingMessageCount: session.pendingMessageCount,
      });
      // `steer()` only queues a user message. If it lands after PI Mono's last steering poll for
      // the current run, `prompt()` can return with pending messages still enqueued and not yet
      // emitted as transcripted `message_end` events, so drain the queue before closing the turn.
      const pendingDrainStartedAtMilliseconds = Date.now();
      let drainIterations = 0;
      while (session.pendingMessageCount > 0) {
        drainIterations += 1;
        await session.agent.continue();
      }
      this.logEnhanced(runtimeLogger, runtime.getCompanyId(), sessionId, "session_prompt_tail", "session_prompt_pending_drain_end", {
        drainIterations,
        durationMs: Date.now() - pendingDrainStartedAtMilliseconds,
      });
    } finally {
      completedTurnAt = new Date();
      const finishPromptTurnStartedAtMilliseconds = Date.now();
      await runtime.eventHandler.finishPromptTurn(completedTurnAt);
      this.logEnhanced(runtimeLogger, runtime.getCompanyId(), sessionId, "session_prompt_tail", "session_prompt_finish_turn_end", {
        durationMs: Date.now() - finishPromptTurnStartedAtMilliseconds,
      });
    }
    const snapshotStartedAtMilliseconds = Date.now();
    await this.persistRuntimeContextSnapshot(runtime, transactionProvider, sessionId, completedTurnAt);
    this.logEnhanced(runtimeLogger, runtime.getCompanyId(), sessionId, "session_prompt_tail", "session_prompt_snapshot_end", {
      durationMs: Date.now() - snapshotStartedAtMilliseconds,
    });
  }

  async steer(
    runtime: AgentSessionRuntimeContext,
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    message: string,
    images?: ImageContent[],
    userMessageCreatedAt?: Date,
    queuedMessageId?: string,
    principalMetadata?: {
      principalAgentId: string | null;
      principalSessionId: string | null;
      principalType: "agent_message" | "github_webhook" | "schedule" | "task" | "user" | "workflow";
      taskRunId: string | null;
      workflowRunId: string | null;
    },
  ): Promise<void> {
    if (userMessageCreatedAt) {
      runtime.eventHandler.queueUserMessageTimestamp(userMessageCreatedAt, queuedMessageId, principalMetadata);
    }

    const session = runtime.session;
    await session.steer(message, images);
    await this.persistRuntimeContextSnapshot(runtime, transactionProvider, sessionId);
  }

  async persistRuntimeContextSnapshot(
    runtime: AgentSessionRuntimeContext,
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    snapshotAt: Date = new Date(),
  ): Promise<void> {
    const session = runtime.session;
    await this.persistContextMessagesSnapshot(
      transactionProvider,
      sessionId,
      session.agent.state.messages,
      snapshotAt,
      this.buildContextSnapshot(session),
    );
  }

  async recordInterruptedUsage(
    runtime: AgentSessionRuntimeContext,
    recordedAt: Date = new Date(),
  ): Promise<void> {
    await runtime.eventHandler.recordInterruptedAssistantUsage(
      runtime.session.agent.state.streamingMessage,
      recordedAt,
    );
  }

  async abort(runtime: AgentSessionRuntimeContext): Promise<void> {
    await runtime.session.abort();
  }

  async disposeRuntime(runtime: AgentSessionRuntimeContext): Promise<void> {
    try {
      const cleanupToolsStartedAtMilliseconds = Date.now();
      await runtime.toolsService.cleanupTools();
      this.logEnhanced(runtime.logger, runtime.getCompanyId(), runtime.bootstrapContext.sessionId, "session_process_cleanup", "session_runtime_cleanup_tools_end", {
        durationMs: Date.now() - cleanupToolsStartedAtMilliseconds,
      });
    } finally {
      const sessionDisposeStartedAtMilliseconds = Date.now();
      runtime.session.dispose();
      this.logEnhanced(runtime.logger, runtime.getCompanyId(), runtime.bootstrapContext.sessionId, "session_process_cleanup", "session_runtime_dispose_end", {
        durationMs: Date.now() - sessionDisposeStartedAtMilliseconds,
      });
    }
  }

  private logEnhanced(
    logger: SessionPipelineLogger,
    companyId: string,
    sessionId: string,
    diagnosticComponent: string,
    diagnosticEvent: string,
    fields: Record<string, unknown>,
  ): void {
    if (!this.enhancedLoggingService.shouldLogEnhanced(companyId, diagnosticComponent, sessionId)) {
      return;
    }

    logger.info({
      ...fields,
      companyId,
      diagnostic: "enhanced",
      diagnosticComponent,
      diagnosticEvent,
      event: diagnosticEvent,
      sessionId,
    }, "enhanced diagnostic log");
  }

  private async createBootstrapContext(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    runtimeConfig: SessionRuntimeConfig,
  ): Promise<AgentSessionBootstrapContext> {
    const promptScope = new AgentEnvironmentPromptScope(
      transactionProvider,
      this.agentEnvironmentAccessService,
      runtimeConfig.agentId,
      sessionId,
    );
    const selection = await this.templateService.getAgentTemplateSelection(
      transactionProvider,
      runtimeConfig.companyId,
      runtimeConfig.agentId,
    );

    return new AgentSessionBootstrapContext({
      agentId: runtimeConfig.agentId,
      agentName: runtimeConfig.agentName,
      agentSystemPrompt: runtimeConfig.agentSystemPrompt ?? null,
      companyBaseSystemPrompt: runtimeConfig.companyBaseSystemPrompt ?? null,
      companyId: runtimeConfig.companyId,
      companyName: runtimeConfig.companyName,
      computeProviderDefinitionId: selection.providerDefinitionId,
      environmentProvider: selection.provider,
      environmentTemplate: selection.template,
      logger: this.logger,
      modelApiKey: runtimeConfig.apiKey,
      modelId: runtimeConfig.modelId,
      modelProviderId: runtimeConfig.providerId,
      promptScope,
      reasoningLevel: runtimeConfig.reasoningLevel ?? null,
      sessionId,
      transactionProvider,
      userFirstName: runtimeConfig.userFirstName ?? null,
    });
  }

  private resolveThinkingLevel(reasoningLevel?: string | null): ThinkingLevel | undefined {
    if (!reasoningLevel) {
      return undefined;
    }

    return reasoningLevel as ThinkingLevel;
  }

  private createSettingsManager(
    runtimeConfig: SessionRuntimeConfig,
    model: { contextWindow?: number | null },
  ): SettingsManager {
    return this.compactionSettingsManagerFactory.create(
      model.contextWindow,
      runtimeConfig.autoCompactPercent ?? null,
    );
  }

  private async configureOpenRouterProvider(
    apiKey: string,
    modelRegistry: PiMonoModelRegistry,
  ): Promise<void> {
    const models = await this.openRouterCatalogService.fetchCatalog(apiKey, {
      validateCredential: false,
    });
    if (models.length === 0) {
      throw new Error("OpenRouter did not return any models.");
    }

    modelRegistry.registerProvider("openrouter", {
      api: "openai-completions",
      apiKey,
      baseUrl: OpenRouterCatalogService.API_BASE_URL,
      models: models.map((model) => ({
        contextWindow: model.contextWindow,
        cost: model.cost,
        id: model.modelId,
        input: model.input,
        maxTokens: model.maxTokens,
        name: model.name,
        reasoning: model.reasoningSupported,
      })),
    });
  }

  private configureOpenAiCompatibleProvider(
    runtimeConfig: SessionRuntimeConfig,
    modelRegistry: PiMonoModelRegistry,
  ): void {
    const baseUrl = this.resolveOpenAiCompatibleBaseUrl(runtimeConfig.baseUrl);
    const modelName = String(runtimeConfig.modelName || "").trim() || runtimeConfig.modelId;

    modelRegistry.registerProvider("openai-compatible", {
      api: "openai-completions",
      apiKey: runtimeConfig.apiKey,
      baseUrl,
      models: [{
        compat: {
          maxTokensField: "max_tokens",
          supportsDeveloperRole: false,
          supportsReasoningEffort: false,
          supportsStore: false,
          supportsUsageInStreaming: false,
        },
        contextWindow: 128000,
        cost: {
          cacheRead: 0,
          cacheWrite: 0,
          input: 0,
          output: 0,
        },
        id: runtimeConfig.modelId,
        input: ["text"],
        maxTokens: 16384,
        name: modelName,
        reasoning: Boolean(runtimeConfig.reasoningSupported),
      }],
    });
  }

  private resolveOpenAiCompatibleBaseUrl(rawBaseUrl: string | null | undefined): string {
    const normalizedBaseUrl = String(rawBaseUrl || "").trim();
    if (!normalizedBaseUrl) {
      throw new Error("baseUrl is required for OpenAI-compatible providers.");
    }

    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(normalizedBaseUrl);
    } catch {
      throw new Error("baseUrl must be a valid HTTP(S) URL.");
    }
    if (parsedBaseUrl.protocol !== "http:" && parsedBaseUrl.protocol !== "https:") {
      throw new Error("baseUrl must be a valid HTTP(S) URL.");
    }

    return normalizedBaseUrl;
  }

  private async loadStoredContextMessagesSnapshot(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
  ): Promise<StoredContextMessagesSnapshot> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [sessionRecord] = await selectableDatabase
        .select({
          contextMessagesSnapshot: agentSessions.contextMessagesSnapshot,
          contextMessagesSnapshotAt: agentSessions.contextMessagesSnapshotAt,
        })
        .from(agentSessions)
        .where(eq(agentSessions.id, sessionId));

      return {
        contextMessagesSnapshot: Array.isArray(sessionRecord?.contextMessagesSnapshot)
          ? sessionRecord.contextMessagesSnapshot as AgentMessage[]
          : [],
        contextMessagesSnapshotAt: sessionRecord?.contextMessagesSnapshotAt instanceof Date
          ? sessionRecord.contextMessagesSnapshotAt
          : null,
      };
    });
  }

  private async persistContextMessagesSnapshot(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    messages: AgentMessage[],
    completedTurnAt: Date = new Date(),
    contextSnapshot: {
      currentContextTokens: number | null;
      isCompacting: boolean;
      maxContextTokens: number | null;
    } = {
      currentContextTokens: null,
      isCompacting: false,
      maxContextTokens: null,
    },
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      await updatableDatabase
        .update(agentSessions)
        .set({
          contextMessagesSnapshot: messages,
          contextMessagesSnapshotAt: completedTurnAt,
          currentContextTokens: contextSnapshot.currentContextTokens,
          isCompacting: contextSnapshot.isCompacting,
          maxContextTokens: contextSnapshot.maxContextTokens,
          updated_at: new Date(),
        })
        .where(eq(agentSessions.id, sessionId));
    });
  }

  private buildContextSnapshot(session: AgentSession): {
    currentContextTokens: number | null;
    isCompacting: boolean;
    maxContextTokens: number | null;
  } {
    const contextUsage = session.getContextUsage();
    return {
      currentContextTokens: contextUsage?.tokens ?? null,
      isCompacting: session.isCompacting,
      maxContextTokens: contextUsage?.contextWindow ?? session.model?.contextWindow ?? null,
    };
  }
}
