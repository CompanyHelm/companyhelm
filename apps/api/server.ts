import "reflect-metadata";
import pino from "pino";
import { ApiCli } from "./src/cli/api_cli.ts";
import { ApiContainer } from "./src/api_container.ts";
import { ConfigLoader } from "./src/config/config_loader.ts";
import { Config, ConfigDocument } from "./src/config/schema.ts";
import { ApiLogger } from "./src/log/api_logger.ts";
import { ApiServer } from "./src/server/api_server.ts";
import { DbBootstrap } from "./src/db/bootstrap/bootstrap.ts";

try {
  const argumentsDocument = new ApiCli().parse(process.argv);
  const config = new Config(ConfigLoader.load(argumentsDocument.configPath, ConfigDocument));
  const container = new ApiContainer().build(config);
  await container.get(DbBootstrap).run();
  await container.get(ApiServer).start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  pino(ApiLogger.createOptions({
    log: {
      level: "error",
      json: true,
    },
  } as Pick<Config, "log">)).error({
    error,
  }, message);
  process.exit(1);
}
