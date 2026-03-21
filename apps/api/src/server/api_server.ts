import Fastify from "fastify";
import type { Container } from "inversify";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { GraphqlApplication } from "../graphql/graphql_application.ts";
import type { AppConfigDocument } from "../config/schema.ts";
import { CONFIG_SERVICE_IDENTIFIER } from "../di/config_service_identifier.ts";

/**
 * Builds and starts the Fastify API with its transport dependencies attached.
 */
export class ApiServer {
  private readonly config;
  private readonly configDocument;
  private readonly database;
  private readonly app;

  constructor(container: Container) {
    this.config = container.get<AppConfigDocument>(CONFIG_SERVICE_IDENTIFIER);
    this.configDocument = this.config.getDocument();
    this.database = new AppRuntimeDatabase(this.config);
    this.app = Fastify({
      logger: {
        level: this.configDocument.log_level,
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
      host: this.configDocument.host,
      port: this.configDocument.port,
    });
  }
}
