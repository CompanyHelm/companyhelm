import "reflect-metadata";
import pino from "pino";
import { ApiContainer } from "./api_container.ts";
import { ApiCli } from "./cli/api_cli.ts";
import { ConfigLoader } from "./config/config_loader.ts";
import { Config, ConfigDocument } from "./config/schema.ts";
import { DbBootstrap } from "./db/bootstrap/bootstrap.ts";
import { ApiLogger } from "./log/api_logger.ts";
import { ApiServer } from "./server/api_server.ts";

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
