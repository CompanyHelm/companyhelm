import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { AddModelProviderCredentialMutation } from "./mutations/add_model_provider_credential.ts";
import { DeleteModelProviderCredentialMutation } from "./mutations/delete_model_provider_credential.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";
import { MeQueryResolver } from "./resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "./resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "./resolvers/model_provider_credentials.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable()
export class GraphqlApplication {
  private readonly configDocument: Config;
  private readonly addModelProviderCredentialMutation: AddModelProviderCredentialMutation;
  private readonly deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation;
  private readonly graphqlRequestContextResolver: GraphqlRequestContextResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver;
  private readonly modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver;

  constructor(
    @inject(Config) config: Config,
    @inject(AddModelProviderCredentialMutation) addModelProviderCredentialMutation: AddModelProviderCredentialMutation,
    @inject(DeleteModelProviderCredentialMutation)
    deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation,
    @inject(GraphqlRequestContextResolver) graphqlRequestContextResolver: GraphqlRequestContextResolver,
    @inject(HealthQueryResolver) healthQueryResolver: HealthQueryResolver,
    @inject(MeQueryResolver) meQueryResolver: MeQueryResolver,
    @inject(ModelProviderCredentialModelsQueryResolver)
    modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver,
    @inject(ModelProviderCredentialsQueryResolver) modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver,
  ) {
    this.configDocument = config;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.deleteModelProviderCredentialMutation = deleteModelProviderCredentialMutation;
    this.graphqlRequestContextResolver = graphqlRequestContextResolver;
    this.healthQueryResolver = healthQueryResolver;
    this.meQueryResolver = meQueryResolver;
    this.modelProviderCredentialModelsQueryResolver = modelProviderCredentialModelsQueryResolver;
    this.modelProviderCredentialsQueryResolver = modelProviderCredentialsQueryResolver;
  }

  async register(app: FastifyInstance): Promise<void> {
    await app.register(mercurius, {
      schema: GraphqlSchema.getDocument(),
      context: (request) => this.graphqlRequestContextResolver.resolve(request),
      resolvers: {
        Query: {
          health: this.healthQueryResolver.execute,
          Me: this.meQueryResolver.execute,
          ModelProviderCredentialModels: this.modelProviderCredentialModelsQueryResolver.execute,
          ModelProviderCredentials: this.modelProviderCredentialsQueryResolver.execute,
        },
        Mutation: {
          AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
          DeleteModelProviderCredential: this.deleteModelProviderCredentialMutation.execute,
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    });
  }
}
