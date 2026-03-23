import fastifyCors from "@fastify/cors";
import Fastify, { type FastifyServerOptions } from "fastify";
import { decorate, inject, injectable } from "inversify";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { GraphqlApplication } from "../graphql/graphql_application.ts";
import { Config, type ConfigDocument } from "../config/schema.ts";

/**
 * Builds and starts the Fastify API with its transport dependencies attached.
 */
@injectable("Singleton")
export class ApiServer {
  private readonly config: ConfigDocument;
  private readonly database;
  private readonly graphqlApplication;
  private readonly app;

  constructor(
    config: ConfigDocument,
    database: AppRuntimeDatabase,
    graphqlApplication: GraphqlApplication,
  ) {
    this.config = config;
    this.database = database;
    this.graphqlApplication = graphqlApplication;
    this.app = Fastify({
      logger: ApiServer.createLoggerOptions(this.config),
    });
  }

  async start(): Promise<void> {
    this.app.addHook("onClose", async () => {
      await this.database.close();
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
  }

  static createLoggerOptions(config: Pick<ConfigDocument, "log">): FastifyServerOptions["logger"] {
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

decorate(inject(Config), ApiServer, 0);
decorate(inject(AppRuntimeDatabase), ApiServer, 1);
decorate(inject(GraphqlApplication), ApiServer, 2);
