import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import type { AuthProviderDatabase } from "../auth/providers/auth_provider_interface.ts";
import type { Config } from "../config/config.ts";
import type { AppConfigDocument } from "../config/schema.ts";
import { SignUpMutation } from "./mutations/sign_up.ts";
import { GraphqlSchema } from "./graphql_schema.ts";
import { SignUpMutationResolver } from "./resolvers/mutation/sign_up.ts";
import { HealthQueryResolver } from "./resolvers/query/health.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
export class GraphqlApplication {
  private readonly configDocument;
  private readonly healthQueryResolver = new HealthQueryResolver();
  private readonly signUpMutationResolver: SignUpMutationResolver;

  constructor(
    config: Pick<Config<AppConfigDocument>, "getDocument">,
    database: AuthProviderDatabase,
  ) {
    this.configDocument = config.getDocument();
    this.signUpMutationResolver = new SignUpMutationResolver(
      new SignUpMutation(config, database),
    );
  }

  async register(app: FastifyInstance): Promise<void> {
    const healthQueryResolver = this.healthQueryResolver.execute;
    const signUpMutationResolver = this.signUpMutationResolver.execute;

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
