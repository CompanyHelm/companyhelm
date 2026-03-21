import { readFileSync } from "node:fs";

/**
 * Loads the GraphQL SDL from a dedicated schema asset so transport code stays thin.
 */
export class GraphqlSchema {
  private static readonly schemaDocument = readFileSync(
    new URL("./schema.graphql", import.meta.url),
    "utf8",
  );

  static getDocument(): string {
    return GraphqlSchema.schemaDocument;
  }
}
