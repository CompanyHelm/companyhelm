import { ApiCli } from "./src/cli/api_cli.ts";
import { ConfigLoader } from "./src/config/loader.ts";
import { Config } from "./src/config/schema.ts";
import { AppContainer } from "./src/di/app_container.ts";
import { ApiServer } from "./src/server/api_server.ts";

try {
  const argumentsDocument = new ApiCli().parse(process.argv);
  const config = ConfigLoader.loadFromPath(argumentsDocument.configPath, Config);
  const container = new AppContainer();
  container.bindConfig(config);

  await new ApiServer(container).start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
