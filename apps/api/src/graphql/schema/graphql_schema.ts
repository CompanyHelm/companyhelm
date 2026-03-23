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
      "./query.graphql",
      "./mutation.graphql",
      "./types/auth_session.graphql",
      "./types/authenticated_company.graphql",
      "./types/authenticated_user.graphql",
      "./types/model_provider_credential.graphql",
      "./inputs/add_model_provider_credential_input.graphql",
      "./inputs/sign_in_input.graphql",
      "./inputs/sign_up_input.graphql",
    ]
      .map((relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8").trim())
      .join("\n\n");
  }
}
