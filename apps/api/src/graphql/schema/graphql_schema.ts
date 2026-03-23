import { readFileSync } from "node:fs";

/**
 * Loads the GraphQL SDL from the canonical schema document used by the API and web clients.
 */
export class GraphqlSchema {
  private static readonly schemaDocument = GraphqlSchema.loadSchemaDocument();

  static getDocument(): string {
    return GraphqlSchema.schemaDocument;
  }

  private static loadSchemaDocument(): string {
    return readFileSync(new URL("./schema.graphql", import.meta.url), "utf8").trim();
  }
}
