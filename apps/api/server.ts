import { ApiCli } from "./src/cli/api_cli.ts";
import { ConfigLoader } from "./src/config/loader.ts";
import { Config } from "./src/config/schema.ts";
import { Container } from "inversify";
import { CONFIG_SERVICE_IDENTIFIER } from "./src/di/config_service_identifier.ts";
import { ApiServer } from "./src/server/api_server.ts";

try {
  const argumentsDocument = new ApiCli().parse(process.argv);
  const config = ConfigLoader.loadFromPath(argumentsDocument.configPath, Config);
  const container = new Container({
    autobind: true,
  });
  container.bind(CONFIG_SERVICE_IDENTIFIER).toConstantValue(config);

  await new ApiServer(container).start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
