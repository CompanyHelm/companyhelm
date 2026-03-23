import "reflect-metadata";
import { ApiCli } from "./src/cli/api_cli.ts";
import { ApiContainer } from "./src/api_container.ts";
import { ConfigLoader } from "./src/config/config_loader.ts";
import { Config, ConfigDocument } from "./src/config/schema.ts";
import { ApiServer } from "./src/server/api_server.ts";
import { DbBootstrap } from "./src/db/bootstrap.ts";

try {
  const argumentsDocument = new ApiCli().parse(process.argv);
  const config = new Config(ConfigLoader.load(argumentsDocument.configPath, ConfigDocument));
  const container = new ApiContainer().build(config);
  await container.get(DbBootstrap).run();
  await container.get(ApiServer).start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
