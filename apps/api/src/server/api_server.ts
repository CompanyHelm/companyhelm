import Fastify from "fastify";
import { decorate, inject, injectable } from "inversify";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { GraphqlApplication } from "../graphql/graphql_application.ts";
import { Config, type ConfigDocument } from "../config/schema.ts";

/**
 * Builds and starts the Fastify API with its transport dependencies attached.
 */
@injectable()
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
      logger: {
        level: this.config.log_level,
      },
    });
  }

  async start(): Promise<void> {
    this.app.addHook("onClose", async () => {
      await this.database.close();
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
}

decorate(inject(Config), ApiServer, 0);
decorate(inject(AppRuntimeDatabase), ApiServer, 1);
decorate(inject(GraphqlApplication), ApiServer, 2);
