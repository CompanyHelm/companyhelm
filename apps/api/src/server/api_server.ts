import fastifyCors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import Fastify, { type FastifyServerOptions } from "fastify";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { AdminDatabase } from "../db/admin_database.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { GraphqlApplication } from "../graphql/graphql_application.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { GithubWebhookQueueService } from "../github/webhooks/queue.ts";
import { QueuePolicyValidator } from "../services/redis/queue_policy_validator.ts";
import { RoutineSchedulerSyncService } from "../services/routines/scheduler_sync.ts";
import { GithubWebhookWorker } from "../workers/github_webhooks.ts";
import { LlmOauthRefreshWorker } from "../workers/llm_oauth_refresh_worker.ts";
import { RoutineTriggerWorker } from "../workers/routine_triggers.ts";
import { SessionProcessWorker } from "../workers/session_process.ts";
import { EnvironmentTerminalWebsocketRoute } from "./environment_terminal_websocket_route.ts";
import { GithubWebhookRoute } from "./github_webhook_route.ts";

/**
 * Builds and starts the Fastify API with its transport dependencies attached.
 */
@injectable()
export class ApiServer {
  private readonly config: Config;
  private readonly adminDatabase: AdminDatabase;
  private readonly database: AppRuntimeDatabase;
  private readonly graphqlApplication: GraphqlApplication;
  private readonly githubWebhookQueueService: GithubWebhookQueueService;
  private readonly githubWebhookRoute: GithubWebhookRoute;
  private readonly githubWebhookWorker: GithubWebhookWorker;
  private readonly llmOauthRefreshWorker: LlmOauthRefreshWorker;
  private readonly logger: ApiLogger;
  private readonly environmentTerminalWebsocketRoute: EnvironmentTerminalWebsocketRoute;
  private readonly queuePolicyValidator: QueuePolicyValidator;
  private readonly routineSchedulerSyncService: RoutineSchedulerSyncService;
  private readonly routineTriggerWorker: RoutineTriggerWorker;
  private readonly sessionProcessWorker: SessionProcessWorker;
  private readonly app;

  constructor(
    @inject(Config) config: Config,
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(AppRuntimeDatabase) database: AppRuntimeDatabase,
    @inject(GraphqlApplication) graphqlApplication: GraphqlApplication,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(QueuePolicyValidator) queuePolicyValidator: QueuePolicyValidator,
    @inject(LlmOauthRefreshWorker) llmOauthRefreshWorker: LlmOauthRefreshWorker,
    @inject(SessionProcessWorker) sessionProcessWorker: SessionProcessWorker,
    @inject(RoutineSchedulerSyncService) routineSchedulerSyncService: RoutineSchedulerSyncService,
    @inject(RoutineTriggerWorker) routineTriggerWorker: RoutineTriggerWorker,
    @inject(EnvironmentTerminalWebsocketRoute)
    environmentTerminalWebsocketRoute: EnvironmentTerminalWebsocketRoute = {
      register() {},
    } as never,
    @inject(GithubWebhookQueueService)
    githubWebhookQueueService: GithubWebhookQueueService = {
      async close() {},
    } as never,
    @inject(GithubWebhookRoute)
    githubWebhookRoute: GithubWebhookRoute = {
      register() {},
    } as never,
    @inject(GithubWebhookWorker)
    githubWebhookWorker: GithubWebhookWorker = {
      start() {},
      async stop() {},
    } as never,
  ) {
    this.config = config;
    this.adminDatabase = adminDatabase;
    this.database = database;
    this.graphqlApplication = graphqlApplication;
    this.githubWebhookQueueService = githubWebhookQueueService;
    this.githubWebhookRoute = githubWebhookRoute;
    this.githubWebhookWorker = githubWebhookWorker;
    this.logger = logger;
    this.environmentTerminalWebsocketRoute = environmentTerminalWebsocketRoute;
    this.queuePolicyValidator = queuePolicyValidator;
    this.llmOauthRefreshWorker = llmOauthRefreshWorker;
    this.routineSchedulerSyncService = routineSchedulerSyncService;
    this.routineTriggerWorker = routineTriggerWorker;
    this.sessionProcessWorker = sessionProcessWorker;
    this.app = Fastify({
      loggerInstance: this.logger.getLogger(),
    });
  }

  async start(): Promise<void> {
    await this.queuePolicyValidator.validateNoEvictionPolicy();

    this.app.addHook("onClose", async () => {
      this.llmOauthRefreshWorker.stop();
      await this.githubWebhookWorker.stop();
      await this.sessionProcessWorker.stop();
      await this.routineTriggerWorker.stop();
      await this.githubWebhookQueueService.close();
      await this.database.close();
      await this.adminDatabase.close();
    });

    await this.app.register(fastifyCors, {
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials,
      methods: this.config.cors.methods,
      allowedHeaders: this.config.cors.allowed_headers,
    });
    await this.app.register(fastifyWebsocket);

    this.app.get("/health", async () => {
      return { status: "ok" };
    });

    await this.graphqlApplication.register(this.app as never);
    this.githubWebhookRoute.register(this.app as never);
    this.environmentTerminalWebsocketRoute.register(this.app as never);

    await this.app.listen({
      host: this.config.host,
      port: this.config.port,
    });

    await this.routineSchedulerSyncService.syncEnabledCronTriggers();
    this.llmOauthRefreshWorker.start();
    this.githubWebhookWorker.start();
    this.sessionProcessWorker.start();
    this.routineTriggerWorker.start();
  }

  static createLoggerOptions(config: Pick<Config, "log">): FastifyServerOptions["logger"] {
    return ApiLogger.createOptions(config);
  }
}
