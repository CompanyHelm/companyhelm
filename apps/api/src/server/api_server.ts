import Fastify from "fastify";
import type { Container } from "inversify";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { GraphqlApplication } from "../graphql/graphql_application.ts";
import { Config, type ConfigDocument } from "../config/schema.ts";

/**
 * Builds and starts the Fastify API with its transport dependencies attached.
 */
export class ApiServer {
  private readonly config: ConfigDocument;
  private readonly database;
  private readonly app;

  constructor(container: Container) {
    this.config = container.get<ConfigDocument>(Config);
    this.database = new AppRuntimeDatabase(this.config);
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

    await new GraphqlApplication(this.config, this.database.getDatabase()).register(this.app);

    await this.app.listen({
      host: this.config.host,
      port: this.config.port,
    });
  }
}
