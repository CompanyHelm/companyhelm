import { ApiCli } from "./src/cli/api_cli.ts";
import { ConfigLoader } from "./src/config/config_loader.ts";
import { Config, ConfigDocument } from "./src/config/schema.ts";
import { AuthProviderFactory } from "./src/auth/auth_provider_factory.ts";
import { ApiServer } from "./src/server/api_server.ts";
import { AppRuntimeDatabase } from "./src/db/app_runtime_database.ts";
import { DbBootstrap } from "./src/db/bootstrap.ts";
import { GraphqlAppRuntimeDatabase } from "./src/graphql/graphql_app_runtime_database.ts";
import { GraphqlRequestContextResolver } from "./src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "./src/graphql/mutations/add_model_provider_credential.ts";
import { HealthQueryResolver } from "./src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "./src/graphql/resolvers/me.ts";
import { ModelProviderCredentialsQueryResolver } from "./src/graphql/resolvers/model_provider_credentials.ts";
import { GraphqlApplication } from "./src/graphql/graphql_application.ts";

try {
  const argumentsDocument = new ApiCli().parse(process.argv);
  const config = new Config(ConfigLoader.load(argumentsDocument.configPath, ConfigDocument));
  const appRuntimeDatabase = new AppRuntimeDatabase(config);
  const authProvider = AuthProviderFactory.createAuthProvider(config, {
    appRuntimeDatabase,
  });
  const graphqlAppRuntimeDatabase = new GraphqlAppRuntimeDatabase(appRuntimeDatabase);
  const addModelProviderCredentialMutation = new AddModelProviderCredentialMutation(graphqlAppRuntimeDatabase);
  const graphqlRequestContextResolver = new GraphqlRequestContextResolver(authProvider, appRuntimeDatabase);
  const healthQueryResolver = new HealthQueryResolver();
  const meQueryResolver = new MeQueryResolver();
  const modelProviderCredentialsQueryResolver = new ModelProviderCredentialsQueryResolver(graphqlAppRuntimeDatabase);
  const graphqlApplication = new GraphqlApplication(
    config,
    addModelProviderCredentialMutation,
    graphqlRequestContextResolver,
    healthQueryResolver,
    meQueryResolver,
    modelProviderCredentialsQueryResolver,
  );
  const dbBootstrap = new DbBootstrap(config);
  const apiServer = new ApiServer(config, appRuntimeDatabase, graphqlApplication);
  await dbBootstrap.run();
  await apiServer.start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
