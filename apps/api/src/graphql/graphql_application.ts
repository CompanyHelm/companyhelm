import { decorate, inject, injectable } from "inversify";
import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import { Config, type ConfigDocument } from "../config/schema.ts";
import { AddModelProviderCredentialMutation } from "./mutations/add_model_provider_credential.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";
import { MeQueryResolver } from "./resolvers/me.ts";
import { ModelProviderCredentialsQueryResolver } from "./resolvers/model_provider_credentials.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable("Singleton")
export class GraphqlApplication {
  private readonly configDocument: ConfigDocument;
  private readonly addModelProviderCredentialMutation: AddModelProviderCredentialMutation;
  private readonly graphqlRequestContextResolver: GraphqlRequestContextResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver;

  constructor(
    config: ConfigDocument,
    addModelProviderCredentialMutation: AddModelProviderCredentialMutation,
    graphqlRequestContextResolver: GraphqlRequestContextResolver,
    healthQueryResolver: HealthQueryResolver,
    meQueryResolver: MeQueryResolver,
    modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver,
  ) {
    this.configDocument = config;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.graphqlRequestContextResolver = graphqlRequestContextResolver;
    this.healthQueryResolver = healthQueryResolver;
    this.meQueryResolver = meQueryResolver;
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
          ModelProviderCredentials: this.modelProviderCredentialsQueryResolver.execute,
        },
        Mutation: {
          AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    });
  }
}

decorate(inject(Config), GraphqlApplication, 0);
decorate(inject(AddModelProviderCredentialMutation), GraphqlApplication, 1);
decorate(inject(GraphqlRequestContextResolver), GraphqlApplication, 2);
decorate(inject(HealthQueryResolver), GraphqlApplication, 3);
decorate(inject(MeQueryResolver), GraphqlApplication, 4);
decorate(inject(ModelProviderCredentialsQueryResolver), GraphqlApplication, 5);
