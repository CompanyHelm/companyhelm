import Fastify from "fastify";
import { Config } from "./src/config/config.ts";
import { AppConfigDefinition } from "./src/config/schema.ts";

try {
  const config = Config.get(AppConfigDefinition);
  const document = config.getDocument();
  const app = Fastify({
    logger: {
      level: document.log_level,
    },
  });

  app.get("/", async () => {
    return { message: "hello world" };
  });

  await app.listen({
    host: document.host,
    port: document.port,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
