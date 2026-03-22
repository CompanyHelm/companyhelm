import { decorate, inject, injectable } from "inversify";
import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import { Config, type ConfigDocument } from "../config/schema.ts";
import { SignUpMutation } from "./mutations/sign_up.ts";
import { GraphqlSchema } from "./graphql_schema.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable()
export class GraphqlApplication {
  private readonly configDocument;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly signUpMutation: SignUpMutation;

  constructor(
    config: ConfigDocument,
    signUpMutation: SignUpMutation,
    healthQueryResolver: HealthQueryResolver,
  ) {
    this.configDocument = config;
    this.signUpMutation = signUpMutation;
    this.healthQueryResolver = healthQueryResolver;
  }

  async register(app: FastifyInstance): Promise<void> {
    const healthQueryResolver = this.healthQueryResolver.execute;
    const signUpMutationResolver = this.signUpMutation.execute;

    await app.register(mercurius, {
      schema: GraphqlSchema.getDocument(),
      resolvers: {
        Query: {
          health: healthQueryResolver,
        },
        Mutation: {
          SignUp: signUpMutationResolver,
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    });
  }
}

decorate(inject(Config), GraphqlApplication, 0);
decorate(inject(SignUpMutation), GraphqlApplication, 1);
decorate(inject(HealthQueryResolver), GraphqlApplication, 2);
