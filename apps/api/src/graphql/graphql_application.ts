import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import type { AuthProviderDatabase } from "../auth/providers/auth_provider_interface.ts";
import type { Config } from "../config/config.ts";
import type { AppConfigDocument } from "../config/schema.ts";
import { GraphqlSchema } from "./graphql_schema.ts";
import { SignUpMutation } from "./sign_up_mutation.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
export class GraphqlApplication {
  private readonly configDocument;
  private readonly signUpMutation: SignUpMutation;

  constructor(
    config: Pick<Config<AppConfigDocument>, "getDocument">,
    database: AuthProviderDatabase,
  ) {
    this.configDocument = config.getDocument();
    this.signUpMutation = new SignUpMutation(config, database);
  }

  async register(app: FastifyInstance): Promise<void> {
    await app.register(mercurius, {
      schema: GraphqlSchema.getSchema(),
      resolvers: {
        Query: {
          health: async () => "ok",
        },
        Mutation: {
          SignUp: async (_root: unknown, arguments_: {
            input: {
              email: string;
              firstName: string;
              lastName?: string | null;
              password: string;
            };
          }) => this.signUpMutation.execute(arguments_),
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    });
  }
}
