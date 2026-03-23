import { decorate, inject, injectable } from "inversify";
import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import { Config, type ConfigDocument } from "../config/schema.ts";
import { AddModelProviderCredentialMutation } from "./mutations/add_model_provider_credential.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { SignInMutation } from "./mutations/sign_in.ts";
import { SignUpMutation } from "./mutations/sign_up.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable("Singleton")
export class GraphqlApplication {
  private readonly configDocument: ConfigDocument;
  private readonly addModelProviderCredentialMutation: AddModelProviderCredentialMutation;
  private readonly graphqlRequestContextResolver: GraphqlRequestContextResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly signInMutation: SignInMutation;
  private readonly signUpMutation: SignUpMutation;

  constructor(
    config: ConfigDocument,
    addModelProviderCredentialMutation: AddModelProviderCredentialMutation,
    signInMutation: SignInMutation,
    signUpMutation: SignUpMutation,
    graphqlRequestContextResolver: GraphqlRequestContextResolver,
    healthQueryResolver: HealthQueryResolver,
  ) {
    this.configDocument = config;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.signInMutation = signInMutation;
    this.signUpMutation = signUpMutation;
    this.graphqlRequestContextResolver = graphqlRequestContextResolver;
    this.healthQueryResolver = healthQueryResolver;
  }

  async register(app: FastifyInstance): Promise<void> {
    await app.register(mercurius, {
      schema: GraphqlSchema.getDocument(),
      context: (request) => this.graphqlRequestContextResolver.resolve(request),
      resolvers: {
        Query: {
          health: this.healthQueryResolver.execute,
        },
        Mutation: {
          AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
          SignIn: this.signInMutation.execute,
          SignUp: this.signUpMutation.execute,
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    });
  }
}

decorate(inject(Config), GraphqlApplication, 0);
decorate(inject(AddModelProviderCredentialMutation), GraphqlApplication, 1);
decorate(inject(SignInMutation), GraphqlApplication, 2);
decorate(inject(SignUpMutation), GraphqlApplication, 3);
decorate(inject(GraphqlRequestContextResolver), GraphqlApplication, 4);
decorate(inject(HealthQueryResolver), GraphqlApplication, 5);
