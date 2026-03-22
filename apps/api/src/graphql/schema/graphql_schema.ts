import { readFileSync } from "node:fs";

/**
 * Loads the GraphQL SDL from dedicated schema assets so transport code stays thin.
 */
export class GraphqlSchema {
  private static readonly schemaDocument = GraphqlSchema.loadSchemaDocument();

  static getDocument(): string {
    return GraphqlSchema.schemaDocument;
  }

  private static loadSchemaDocument(): string {
    return [
      "./schema/query.graphql",
      "./schema/mutation.graphql",
      "./schema/types/auth_session.graphql",
      "./schema/types/authenticated_user.graphql",
      "./schema/inputs/sign_up_input.graphql",
    ]
      .map((relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8").trim())
      .join("\n\n");
  }
}
