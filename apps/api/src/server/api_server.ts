import Fastify from "fastify";
import { Config } from "../config/config.ts";
import { AppConfigDefinition } from "../config/schema.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { GraphqlApplication } from "../graphql/graphql_application.ts";

/**
 * Builds and starts the Fastify API with its transport dependencies attached.
 */
export class ApiServer {
  private readonly config = Config.get(AppConfigDefinition);
  private readonly configDocument = this.config.getDocument();
  private readonly database = new AppRuntimeDatabase(this.config);
  private readonly app = Fastify({
    logger: {
      level: this.configDocument.log_level,
    },
  });

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
