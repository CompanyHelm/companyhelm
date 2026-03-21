import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema as GraphqlJsSchema,
  GraphQLString,
} from "graphql";

/**
 * Builds the GraphQL schema object Mercurius executes against.
 */
export class GraphqlSchema {
  private static readonly authenticatedUserType = new GraphQLObjectType({
    name: "AuthenticatedUser",
    fields: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
      },
      email: {
        type: new GraphQLNonNull(GraphQLString),
      },
      firstName: {
        type: new GraphQLNonNull(GraphQLString),
      },
      lastName: {
        type: GraphQLString,
      },
      provider: {
        type: new GraphQLNonNull(GraphQLString),
      },
      providerSubject: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
  });

  private static readonly authSessionType = new GraphQLObjectType({
    name: "AuthSession",
    fields: {
      token: {
        type: new GraphQLNonNull(GraphQLString),
      },
      user: {
        type: new GraphQLNonNull(GraphqlSchema.authenticatedUserType),
      },
    },
  });

  private static readonly signUpInputType = new GraphQLInputObjectType({
    name: "SignUpInput",
    fields: {
      email: {
        type: new GraphQLNonNull(GraphQLString),
      },
      firstName: {
        type: new GraphQLNonNull(GraphQLString),
      },
      lastName: {
        type: GraphQLString,
      },
      password: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
  });

  private static readonly queryType = new GraphQLObjectType({
    name: "Query",
    fields: {
      health: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
  });

  private static readonly mutationType = new GraphQLObjectType({
    name: "Mutation",
    fields: {
      SignUp: {
        type: new GraphQLNonNull(GraphqlSchema.authSessionType),
        args: {
          input: {
            type: new GraphQLNonNull(GraphqlSchema.signUpInputType),
          },
        },
      },
    },
  });

  private static readonly schema = new GraphqlJsSchema({
    query: GraphqlSchema.queryType,
    mutation: GraphqlSchema.mutationType,
  });

  static getSchema(): GraphqlJsSchema {
    return GraphqlSchema.schema;
  }
}
