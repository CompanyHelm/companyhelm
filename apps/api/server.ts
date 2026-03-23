import { ApiCli } from "./src/cli/api_cli.ts";
import { ConfigLoader } from "./src/config/config_loader.ts";
import { Config } from "./src/config/schema.ts";
import { Container } from "inversify";
import { AuthProvider } from "./src/auth/auth_provider.ts";
import { AuthProviderFactory } from "./src/auth/auth_provider_factory.ts";
import { ApiServer } from "./src/server/api_server.ts";
import { AppRuntimeDatabase } from "./src/db/app_runtime_database.ts";
import { DbBootstrap } from "./src/db/bootstrap.ts";

try {
  const argumentsDocument = new ApiCli().parse(process.argv);
  const config = ConfigLoader.load(argumentsDocument.configPath, Config);
  const container = new Container({
    autobind: true,
  });
  container.bind(Config).toConstantValue(config);
  container.bind(AuthProvider).toDynamicValue((context) => {
    return AuthProviderFactory.createAuthProvider(context.get(Config), {
      appRuntimeDatabase: context.get(AppRuntimeDatabase),
    });
  }).inSingletonScope();
  await container.get(DbBootstrap).run();

  await container.get(ApiServer).start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
