import { inject, injectable } from "inversify";
import { eq } from "drizzle-orm";
import type { AgentMessage, ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { ImageContent } from "@mariozechner/pi-ai";
import type { Logger as PinoLogger } from "pino";
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  ModelRegistry as PiMonoModelRegistry,
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
import { SessionContextCheckpointService } from "../context_checkpoint_service.ts";
import { CompanyHelmResourceLoader } from "./companyhelm_resource_loader.ts";
import { PiMonoSessionEventHandler } from "./session_event_handler.ts";
import { ComputeProviderDefinitionService } from "../../../compute_provider_definitions/service.ts";
import { ExaWebClient } from "../../../web_search/exa_client.ts";
import { AgentSessionBootstrapContext } from "./bootstrap_context.ts";
import { DefaultAgentSessionModuleRegistry } from "./modules/default_registry.ts";
import { AgentSessionRuntimeContext } from "./runtime_context.ts";
import { Config } from "../../../../config/schema.ts";

type SessionRuntimeConfig = {
  agentId: string;
  agentName: string;
  agentSystemPrompt?: string | null;
  apiKey: string;
  companyBaseSystemPrompt?: string | null;
  companyId: string;
  companyName: string;
  modelId: string;
  providerId: string;
  reasoningLevel?: string | null;
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
 * Owns the process-local PI Mono runtime sessions keyed by CompanyHelm session id. Its scope is
 * creating the SDK runtime for the currently leased turn, restoring persisted context into it, and
 * giving prompt or steer calls access to the paired event handler that writes transcript rows.
 */
@injectable()
export class PiMonoSessionManagerService {
  private readonly agentEnvironmentAccessService: AgentEnvironmentAccessService;
  private readonly githubClient: GithubClient;
  private readonly inboxService: AgentInboxService;
  private readonly logger: PinoLogger;
  private readonly runtimesById = new Map<string, AgentSessionRuntimeContext>();
  private readonly redisService: RedisService;
  private readonly secretService: SecretService;
  private readonly sessionContextCheckpointService: SessionContextCheckpointService;
  private readonly agentConversationService: AgentConversationService;
  private readonly exaWebClient: ExaWebClient;
  private readonly templateService: AgentEnvironmentTemplateService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly modelProviderService: ModelProviderService;
  private readonly openRouterCatalogService: OpenRouterCatalogService;
  private readonly appModelRegistry: ModelRegistry;
  private readonly sessionModuleRegistry: DefaultAgentSessionModuleRegistry;

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
    @inject(SessionContextCheckpointService)
    sessionContextCheckpointService: SessionContextCheckpointService = new SessionContextCheckpointService(),
  ) {
    this.logger = logger.child({
      component: "pi_mono_session_manager_service",
    });
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
    this.sessionContextCheckpointService = sessionContextCheckpointService;
    this.sessionModuleRegistry = new DefaultAgentSessionModuleRegistry({
      agentConversationService: this.agentConversationService,
      config,
      computeProviderDefinitionService: this.computeProviderDefinitionService,
      exaWebClient: this.exaWebClient,
      githubClient: this.githubClient,
      inboxService: this.inboxService,
      logger: this.logger,
      modelProviderService: this.modelProviderService,
      modelRegistry: this.appModelRegistry,
      secretService: this.secretService,
      templateService: this.templateService,
    });
  }

  async ensureSession(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    runtimeConfig: SessionRuntimeConfig,
  ): Promise<AgentSession> {
    const existingRuntime = this.runtimesById.get(sessionId);
    if (existingRuntime) {
      return existingRuntime.session;
    }

    const bootstrapContext = await this.createBootstrapContext(
      transactionProvider,
      sessionId,
      runtimeConfig,
    );
    const authStorage = AuthStorage.inMemory();
    authStorage.setRuntimeApiKey(bootstrapContext.modelProviderId, bootstrapContext.modelApiKey);
    const modelRegistry = new PiMonoModelRegistry(authStorage);
    if (bootstrapContext.modelProviderId === "openrouter") {
      await this.configureOpenRouterProvider(bootstrapContext.modelApiKey, modelRegistry);
    }
    const sessionModuleResolution = await this.sessionModuleRegistry.resolve(bootstrapContext);
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
    const resourceLoader = new CompanyHelmResourceLoader(
      bootstrapContext.toSystemPromptTemplateContext(),
      sessionModuleResolution.appendSystemPrompts,
    );
    await resourceLoader.reload();

    const initializedTools = agentToolsService.initializeTools();
    const { session } = await createAgentSession({
      authStorage,
      modelRegistry,
      sessionManager,
      cwd: DEFAULT_PI_WORKING_DIRECTORY,
      model,
      resourceLoader,
      // Keep the built-in active set empty at startup and register our CompanyHelm tools through
      // `customTools`, because the PI SDK only treats `tools` as an active-name selector.
      tools: [],
      customTools: initializedTools,
      thinkingLevel: this.resolveThinkingLevel(bootstrapContext.reasoningLevel),
    });
    session.setActiveToolsByName(initializedTools.map((tool) => tool.name));
    session.agent.replaceMessages(storedContextMessagesSnapshot.contextMessagesSnapshot);
    const sessionEventHandler = new PiMonoSessionEventHandler(
      transactionProvider,
      sessionId,
      this.redisService,
      {
        contextMessagesSnapshotProvider: () => session.agent.state.messages,
        contextSnapshotProvider: () => this.buildContextSnapshot(session),
        initialContextMessagesSnapshotAt: storedContextMessagesSnapshot.contextMessagesSnapshotAt,
        logger: this.logger,
      },
    );

    session.subscribe((event) => {
      void sessionEventHandler.handle(event);
    });

    this.runtimesById.set(sessionId, new AgentSessionRuntimeContext({
      bootstrapContext,
      eventHandler: sessionEventHandler,
      session,
      toolsService: agentToolsService,
    }));
    return session;
  }

  async prompt(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    message: string,
    images?: ImageContent[],
    userMessageCreatedAt?: Date,
    queuedMessageId?: string,
  ): Promise<void> {
    const runtime = this.getRequiredRuntime(sessionId);
    if (userMessageCreatedAt) {
      runtime.eventHandler.queueUserMessageTimestamp(userMessageCreatedAt, queuedMessageId);
    }

    const session = runtime.session;
    await runtime.eventHandler.startPromptTurn(new Date());
    let completedTurnId: string | null;
    let completedTurnAt: Date;
    try {
      await session.prompt(message, images && images.length > 0 ? { images } : undefined);
      // `steer()` only queues a user message. If it lands after PI Mono's last steering poll for
      // the current run, `prompt()` can return with pending messages still enqueued and not yet
      // emitted as transcripted `message_end` events, so drain the queue before closing the turn.
      while (session.pendingMessageCount > 0) {
        await session.agent.continue();
      }
    } finally {
      completedTurnAt = new Date();
      completedTurnId = await runtime.eventHandler.finishPromptTurn(completedTurnAt);
    }
    await this.persistContextMessagesSnapshot(
      transactionProvider,
      runtime.getCompanyId(),
      sessionId,
      session.agent.state.messages,
      completedTurnId,
      completedTurnAt,
      this.buildContextSnapshot(session),
    );
  }

  async steer(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    message: string,
    images?: ImageContent[],
    userMessageCreatedAt?: Date,
    queuedMessageId?: string,
  ): Promise<void> {
    const runtime = this.getRequiredRuntime(sessionId);
    if (userMessageCreatedAt) {
      runtime.eventHandler.queueUserMessageTimestamp(userMessageCreatedAt, queuedMessageId);
    }

    const session = runtime.session;
    await session.steer(message, images);
    await this.persistContextMessagesSnapshot(
      transactionProvider,
      runtime.getCompanyId(),
      sessionId,
      session.agent.state.messages,
      null,
      new Date(),
      this.buildContextSnapshot(session),
    );
  }

  async abort(sessionId: string): Promise<void> {
    const runtime = this.runtimesById.get(sessionId);
    if (!runtime) {
      return;
    }

    await runtime.session.abort();
  }

  get(sessionId: string): AgentSession | undefined {
    return this.runtimesById.get(sessionId)?.session;
  }

  async dispose(sessionId: string): Promise<void> {
    const runtime = this.runtimesById.get(sessionId);
    if (!runtime) {
      return;
    }

    await runtime.toolsService.cleanupTools();
    runtime.session.dispose();
    this.runtimesById.delete(sessionId);
  }

  private getRequiredRuntime(sessionId: string): AgentSessionRuntimeContext {
    const runtime = this.runtimesById.get(sessionId);
    if (!runtime) {
      throw new Error("Session not found.");
    }

    return runtime;
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
    });
  }

  private resolveThinkingLevel(reasoningLevel?: string | null): ThinkingLevel | undefined {
    if (!reasoningLevel) {
      return undefined;
    }

    return reasoningLevel as ThinkingLevel;
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
    companyId: string,
    sessionId: string,
    messages: AgentMessage[],
    completedTurnId?: string | null,
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
      const insertableDatabase = tx as {
        insert(table: unknown): {
          values(value: Record<string, unknown>): Promise<unknown>;
        };
      };
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

      if (!completedTurnId) {
        return;
      }

      await this.sessionContextCheckpointService.createCheckpointInTransaction(insertableDatabase, {
        companyId,
        contextMessagesSnapshot: messages,
        createdAt: completedTurnAt,
        currentContextTokens: contextSnapshot.currentContextTokens,
        maxContextTokens: contextSnapshot.maxContextTokens,
        sessionId,
        turnId: completedTurnId,
      });
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
