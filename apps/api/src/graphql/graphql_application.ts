import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import type { AuthProviderDatabase } from "../auth/providers/auth_provider_interface.ts";
import type { Config } from "../config/config.ts";
import type { AppConfigDocument } from "../config/schema.ts";
import { SignUpMutation } from "./mutations/sign_up_mutation.ts";
import { GraphqlSchema } from "./graphql_schema.ts";
import { SignUpMutationResolver } from "./resolvers/mutation/sign_up_mutation_resolver.ts";
import { HealthQueryResolver } from "./resolvers/query/health_query_resolver.ts";

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
    await app.register(mercurius, {
      schema: GraphqlSchema.getDocument(),
      resolvers: {
        Query: {
          health: async () => this.healthQueryResolver.execute(),
        },
        Mutation: {
          SignUp: async (root: unknown, arguments_: {
            input: {
              email: string;
              firstName: string;
              lastName?: string | null;
              password: string;
            };
          }) => this.signUpMutationResolver.execute(root, arguments_),
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    });
  }
}
