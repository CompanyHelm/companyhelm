import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import type { AuthProviderDatabase } from "../auth/providers/auth_provider_interface.ts";
import type { ConfigLoader } from "../config/loader.ts";
import type { AppConfigDocument } from "../config/schema.ts";
import { SignUpMutation } from "./mutations/sign_up.ts";
import { GraphqlSchema } from "./graphql_schema.ts";
import { Mutation } from "./resolvers/mutation.ts";
import { HealthQueryResolver } from "./resolvers/query/health.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
export class GraphqlApplication {
  private readonly configDocument;
  private readonly healthQueryResolver = new HealthQueryResolver();
  private readonly signUpMutation: SignUpMutation;

  constructor(
    config: Pick<ConfigLoader<AppConfigDocument>, "getDocument">,
    database: AuthProviderDatabase,
  ) {
    this.configDocument = config.getDocument();
    this.signUpMutation = new SignUpMutation(config, database);
  }

  async register(app: FastifyInstance): Promise<void> {
    const healthQueryResolver = this.healthQueryResolver.execute;
    const signUpMutationResolver = new Mutation(this.signUpMutation.execute).execute;

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
