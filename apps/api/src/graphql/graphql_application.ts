import { decorate, inject, injectable } from "inversify";
import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import { Config, type ConfigDocument } from "../config/schema.ts";
import { SignInMutation } from "./mutations/sign_in.ts";
import { SignUpMutation } from "./mutations/sign_up.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable("Singleton")
export class GraphqlApplication {
  private readonly configDocument;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly signInMutation: SignInMutation;
  private readonly signUpMutation: SignUpMutation;

  constructor(
    config: ConfigDocument,
    signInMutation: SignInMutation,
    signUpMutation: SignUpMutation,
    healthQueryResolver: HealthQueryResolver,
  ) {
    this.configDocument = config;
    this.signInMutation = signInMutation;
    this.signUpMutation = signUpMutation;
    this.healthQueryResolver = healthQueryResolver;
  }

  async register(app: FastifyInstance): Promise<void> {
    await app.register(mercurius, {
      schema: GraphqlSchema.getDocument(),
      resolvers: {
        Query: {
          health: this.healthQueryResolver.execute,
        },
        Mutation: {
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
decorate(inject(SignInMutation), GraphqlApplication, 1);
decorate(inject(SignUpMutation), GraphqlApplication, 2);
decorate(inject(HealthQueryResolver), GraphqlApplication, 3);
