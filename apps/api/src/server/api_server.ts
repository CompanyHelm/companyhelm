import fastifyCors from "@fastify/cors";
import Fastify, { type FastifyServerOptions } from "fastify";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { AdminDatabase } from "../db/admin_database.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { GraphqlApplication } from "../graphql/graphql_application.ts";
import { LlmOauthRefreshWorker } from "../workers/llm_oauth_refresh_worker.ts";

/**
 * Builds and starts the Fastify API with its transport dependencies attached.
 */
@injectable()
export class ApiServer {
  private readonly config: Config;
  private readonly adminDatabase: AdminDatabase;
  private readonly database: AppRuntimeDatabase;
  private readonly graphqlApplication: GraphqlApplication;
  private readonly llmOauthRefreshWorker: LlmOauthRefreshWorker;
  private readonly app;

  constructor(
    @inject(Config) config: Config,
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(AppRuntimeDatabase) database: AppRuntimeDatabase,
    @inject(GraphqlApplication) graphqlApplication: GraphqlApplication,
    @inject(LlmOauthRefreshWorker) llmOauthRefreshWorker: LlmOauthRefreshWorker,
  ) {
    this.config = config;
    this.adminDatabase = adminDatabase;
    this.database = database;
    this.graphqlApplication = graphqlApplication;
    this.llmOauthRefreshWorker = llmOauthRefreshWorker;
    this.app = Fastify({
      logger: ApiServer.createLoggerOptions(this.config),
    });
  }

  async start(): Promise<void> {
    this.app.addHook("onClose", async () => {
      this.llmOauthRefreshWorker.stop();
      await this.database.close();
      await this.adminDatabase.close();
    });

    await this.app.register(fastifyCors, {
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials,
      methods: this.config.cors.methods,
      allowedHeaders: this.config.cors.allowed_headers,
    });

    this.app.get("/", async () => {
      return { message: "hello world" };
    });

    await this.graphqlApplication.register(this.app);

    await this.app.listen({
      host: this.config.host,
      port: this.config.port,
    });

    this.llmOauthRefreshWorker.start();
  }

  static createLoggerOptions(config: Pick<Config, "log">): FastifyServerOptions["logger"] {
    if (!config.log.json) {
      return {
        level: config.log.level,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      };
    }

    return {
      level: config.log.level,
    };
  }
}
