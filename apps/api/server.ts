import { ApiCli } from "./src/cli/api_cli.ts";
import { ConfigLoader } from "./src/config/config_loader.ts";
import { Config } from "./src/config/schema.ts";
import { Container } from "inversify";
import { ApiServer } from "./src/server/api_server.ts";

try {
  const argumentsDocument = new ApiCli().parse(process.argv);
  const config = ConfigLoader.load(argumentsDocument.configPath, Config);
  const container = new Container({
    autobind: true,
  });
  container.bind(Config).toConstantValue(config);

  await new ApiServer(container).start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
