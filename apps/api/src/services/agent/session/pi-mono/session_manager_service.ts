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
import { AgentEnvironmentAccessService } from "../../environment/access_service.ts";
import { AgentEnvironmentPromptScope } from "../../environment/prompt_scope.ts";
import { SecretService } from "../../../secrets/service.ts";
import { AgentToolsService } from "../../tools/service.ts";
import { AgentManagementToolProvider } from "../../tools/agents/provider.ts";
import { AgentManagementToolService } from "../../tools/agents/service.ts";
import { AgentArtifactToolProvider } from "../../tools/artifacts/provider.ts";
import { AgentArtifactToolService } from "../../tools/artifacts/service.ts";
import { AgentCompanyDirectoryToolProvider } from "../../tools/company_directory/provider.ts";
import { AgentCompanyDirectoryToolService } from "../../tools/company_directory/service.ts";
import { AgentConversationService } from "../../conversations/service.ts";
import { AgentConversationToolProvider } from "../../tools/conversations/provider.ts";
import { AgentConversationToolService } from "../../tools/conversations/service.ts";
import { AgentEnvironmentRequirementsService } from "../../environment/requirements_service.ts";
import { AgentGithubInstallationService } from "../../tools/github/installation_service.ts";
import { AgentGithubToolProvider } from "../../tools/github/provider.ts";
import { AgentInboxService } from "../../inbox/service.ts";
import { AgentInboxToolProvider } from "../../tools/inbox/provider.ts";
import { AgentInboxToolService } from "../../tools/inbox/service.ts";
import { AgentSecretToolProvider } from "../../tools/secrets/provider.ts";
import { AgentSecretToolService } from "../../tools/secrets/service.ts";
import { AgentTaskToolProvider } from "../../tools/tasks/provider.ts";
import { AgentTaskToolService } from "../../tools/tasks/service.ts";
import { AgentTerminalToolProvider } from "../../tools/terminal/provider.ts";
import { AgentWebToolProvider } from "../../tools/web/provider.ts";
import { AgentWebToolService } from "../../tools/web/service.ts";
import { ArtifactService } from "../../../artifact_service.ts";
import { ModelRegistry } from "../../../ai_providers/model_registry.ts";
import { ModelProviderService } from "../../../ai_providers/model_provider_service.ts";
import { ApiLogger } from "../../../../log/api_logger.ts";
import { RedisService } from "../../../redis/service.ts";
import { TaskService } from "../../../task_service.ts";
import { SystemPromptTemplateContext } from "../../../../prompts/system_prompt_template_context.ts";
import { AgentEnvironmentWorkspacePath } from "../../environment/workspace_path.ts";
import { CompanyHelmResourceLoader } from "./companyhelm_resource_loader.ts";
import { PiMonoSessionEventHandler } from "./session_event_handler.ts";
import { ComputeProviderDefinitionService } from "../../../compute_provider_definitions/service.ts";
import { ExaWebClient } from "../../../web_search/exa_client.ts";

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

type SessionRuntime = {
  eventHandler: PiMonoSessionEventHandler;
  session: AgentSession;
  toolsService: AgentToolsService;
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
  private readonly runtimesById = new Map<string, SessionRuntime>();
  private readonly redisService: RedisService;
  private readonly secretService: SecretService;
  private readonly agentConversationService: AgentConversationService;
  private readonly exaWebClient: ExaWebClient;
  private readonly requirementsService: AgentEnvironmentRequirementsService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly modelProviderService: ModelProviderService;
  private readonly appModelRegistry: ModelRegistry;

  constructor(
    @inject(ApiLogger) logger: ApiLogger,
    @inject(RedisService) redisService: RedisService,
    @inject(AgentEnvironmentAccessService) agentEnvironmentAccessService: AgentEnvironmentAccessService,
    @inject(GithubClient) githubClient: GithubClient,
    @inject(AgentInboxService) inboxService: AgentInboxService,
    @inject(SecretService) secretService: SecretService,
    @inject(AgentConversationService) agentConversationService: AgentConversationService,
    @inject(ExaWebClient) exaWebClient: ExaWebClient,
    @inject(AgentEnvironmentRequirementsService)
    requirementsService: AgentEnvironmentRequirementsService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
    @inject(ModelProviderService) modelProviderService: ModelProviderService,
    @inject(ModelRegistry) appModelRegistry: ModelRegistry,
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
    this.requirementsService = requirementsService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.modelProviderService = modelProviderService;
    this.appModelRegistry = appModelRegistry;
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

    const authStorage = AuthStorage.inMemory();
    authStorage.setRuntimeApiKey(runtimeConfig.providerId, runtimeConfig.apiKey);
    const modelRegistry = new PiMonoModelRegistry(authStorage);
    const promptScope = new AgentEnvironmentPromptScope(
      transactionProvider,
      this.agentEnvironmentAccessService,
      runtimeConfig.agentId,
      sessionId,
    );
    const githubInstallationService = new AgentGithubInstallationService(
      transactionProvider,
      runtimeConfig.companyId,
      this.githubClient,
    );
    const secretToolService = new AgentSecretToolService(
      transactionProvider,
      runtimeConfig.companyId,
      sessionId,
      this.secretService,
    );
    const companyDirectoryToolService = new AgentCompanyDirectoryToolService(
      transactionProvider,
      runtimeConfig.companyId,
    );
    const agentManagementToolService = new AgentManagementToolService(
      transactionProvider,
      runtimeConfig.companyId,
      runtimeConfig.agentId,
      this.secretService,
      this.requirementsService,
      this.computeProviderDefinitionService,
      this.modelProviderService,
      this.appModelRegistry,
    );
    const inboxToolService = new AgentInboxToolService(
      transactionProvider,
      runtimeConfig.companyId,
      runtimeConfig.agentId,
      sessionId,
      this.inboxService,
    );
    const conversationToolService = new AgentConversationToolService(
      transactionProvider,
      runtimeConfig.companyId,
      runtimeConfig.agentId,
      sessionId,
      this.agentConversationService,
    );
    const artifactToolService = new AgentArtifactToolService(
      transactionProvider,
      runtimeConfig.companyId,
      runtimeConfig.agentId,
      new ArtifactService(),
    );
    const taskToolService = new AgentTaskToolService(
      transactionProvider,
      runtimeConfig.companyId,
      runtimeConfig.agentId,
      new TaskService(),
    );
    const webToolService = new AgentWebToolService(this.exaWebClient);
    const agentToolsService = new AgentToolsService(promptScope, [
      new AgentTerminalToolProvider(promptScope, this.logger),
      new AgentSecretToolProvider(secretToolService),
      new AgentCompanyDirectoryToolProvider(companyDirectoryToolService),
      new AgentManagementToolProvider(agentManagementToolService),
      new AgentGithubToolProvider(promptScope, githubInstallationService),
      new AgentWebToolProvider(webToolService),
      new AgentInboxToolProvider(inboxToolService),
      new AgentConversationToolProvider(conversationToolService),
      new AgentTaskToolProvider(taskToolService),
      new AgentArtifactToolProvider(artifactToolService),
    ]);
    const model = modelRegistry.find(runtimeConfig.providerId, runtimeConfig.modelId);
    if (!model) {
      throw new Error(`Model not found for provider "${runtimeConfig.providerId}": ${runtimeConfig.modelId}`);
    }

    const sessionManager = SessionManager.inMemory();
    sessionManager.newSession({
      id: sessionId,
    });
    const storedContextMessages = await this.loadStoredContextMessages(transactionProvider, sessionId);
    const resourceLoader = new CompanyHelmResourceLoader(
      new SystemPromptTemplateContext(
        runtimeConfig.agentId,
        runtimeConfig.agentName,
        runtimeConfig.companyName,
        sessionId,
      ),
      {
        agentSystemPrompt: runtimeConfig.agentSystemPrompt,
        companyBaseSystemPrompt: runtimeConfig.companyBaseSystemPrompt,
      },
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
      thinkingLevel: this.resolveThinkingLevel(runtimeConfig.reasoningLevel),
    });
    session.setActiveToolsByName(initializedTools.map((tool) => tool.name));
    session.agent.replaceMessages(storedContextMessages);
    const sessionEventHandler = new PiMonoSessionEventHandler(
      transactionProvider,
      sessionId,
      this.redisService,
      {
        contextSnapshotProvider: () => this.buildContextSnapshot(session),
        logger: this.logger,
      },
    );

    session.subscribe((event) => {
      void sessionEventHandler.handle(event);
    });

    this.runtimesById.set(sessionId, {
      eventHandler: sessionEventHandler,
      session,
      toolsService: agentToolsService,
    });
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
    try {
      await session.prompt(message, images && images.length > 0 ? { images } : undefined);
      // `steer()` only queues a user message. If it lands after PI Mono's last steering poll for
      // the current run, `prompt()` can return with pending messages still enqueued and not yet
      // emitted as transcripted `message_end` events, so drain the queue before closing the turn.
      while (session.pendingMessageCount > 0) {
        await session.agent.continue();
      }
    } finally {
      await runtime.eventHandler.finishPromptTurn(new Date());
    }
    await this.persistContextMessages(transactionProvider, sessionId, session.agent.state.messages);
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
    // `steer()` only queues a user message. If the runtime is already idle when the queue entry is
    // added, PI Mono can return without ever emitting transcripted `message_start/message_end`
    // events for that queued user message unless we explicitly continue the loop.
    while (
      session.pendingMessageCount > 0
      && !session.agent.state.isStreaming
      && session.agent.state.messages.at(-1)?.role === "assistant"
    ) {
      await session.agent.continue();
    }
    await this.persistContextMessages(transactionProvider, sessionId, session.agent.state.messages);
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

  private getRequiredRuntime(sessionId: string): SessionRuntime {
    const runtime = this.runtimesById.get(sessionId);
    if (!runtime) {
      throw new Error("Session not found.");
    }

    return runtime;
  }

  private resolveThinkingLevel(reasoningLevel?: string | null): ThinkingLevel | undefined {
    if (!reasoningLevel) {
      return undefined;
    }

    return reasoningLevel as ThinkingLevel;
  }

  private async loadStoredContextMessages(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
  ): Promise<AgentMessage[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [sessionRecord] = await selectableDatabase
        .select({
          contextMessages: agentSessions.context_messages,
        })
        .from(agentSessions)
        .where(eq(agentSessions.id, sessionId));
      if (!Array.isArray(sessionRecord?.contextMessages)) {
        return [];
      }

      return sessionRecord.contextMessages as AgentMessage[];
    });
  }

  private async persistContextMessages(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    messages: AgentMessage[],
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      await updatableDatabase
        .update(agentSessions)
        .set({
          context_messages: messages,
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
