import { ApiCli } from "./src/cli/api_cli.ts";
import { ConfigLoader } from "./src/config/config_loader.ts";
import { Config } from "./src/config/schema.ts";
import { Container } from "inversify";
import { AuthProviderFactory } from "./src/auth/providers/auth_provider_factory.ts";
import { AuthProviderServiceIdentifier } from "./src/auth/providers/auth_provider_service_identifier.ts";
import { AppRuntimeDatabase } from "./src/db/app_runtime_database.ts";
import { GraphqlApplication } from "./src/graphql/graphql_application.ts";
import { SignUpMutation } from "./src/graphql/mutations/sign_up.ts";
import { HealthQueryResolver } from "./src/graphql/resolvers/health.ts";
import { ApiServer } from "./src/server/api_server.ts";

try {
  const argumentsDocument = new ApiCli().parse(process.argv);
  const config = ConfigLoader.load(argumentsDocument.configPath, Config);
  const container = new Container({
    autobind: true,
  });
  container.bind(Config).toConstantValue(config);
  container.bind(AuthProviderServiceIdentifier).toDynamicValue((context) => {
    return AuthProviderFactory.createAuthProvider(context.get(Config));
  }).inSingletonScope();
  container.bind(AppRuntimeDatabase).toDynamicValue((context) => {
    return new AppRuntimeDatabase(context.get(Config));
  }).inSingletonScope();
  container.bind(SignUpMutation).toDynamicValue((context) => {
    return new SignUpMutation(
      context.get(AuthProviderServiceIdentifier),
      context.get(AppRuntimeDatabase),
    );
  }).inSingletonScope();
  container.bind(HealthQueryResolver).toDynamicValue(() => {
    return new HealthQueryResolver();
  }).inSingletonScope();
  container.bind(GraphqlApplication).toDynamicValue((context) => {
    return new GraphqlApplication(
      context.get(Config),
      context.get(SignUpMutation),
      context.get(HealthQueryResolver),
    );
  }).inSingletonScope();

  await container.get(ApiServer).start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
