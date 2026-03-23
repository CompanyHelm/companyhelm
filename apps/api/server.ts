import { ApiCli } from "./src/cli/api_cli.ts";
import { ConfigLoader } from "./src/config/config_loader.ts";
import { ConfigDocument } from "./src/config/schema.ts";
import { Container } from "inversify";
import { AuthProvider } from "./src/auth/auth_provider.ts";
import { AuthProviderFactory } from "./src/auth/auth_provider_factory.ts";
import { ApiServer } from "./src/server/api_server.ts";

try {
  const argumentsDocument = new ApiCli().parse(process.argv);
  const config = ConfigLoader.load(argumentsDocument.configPath, ConfigDocument);
  const container = new Container({
    autobind: true,
  });
  container.bind(ConfigDocument).toConstantValue(config);
  container.bind(AuthProvider).toDynamicValue((context) => {
    return AuthProviderFactory.createAuthProvider(context.get(ConfigDocument));
  }).inSingletonScope();

  await container.get(ApiServer).start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
