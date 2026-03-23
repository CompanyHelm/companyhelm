import { eq } from "drizzle-orm";
import { modelProviderCredentials } from "../../db/schema.ts";
import { GraphqlAppRuntimeDatabase } from "../graphql_app_runtime_database.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: "openai";
  type: "api_key";
  refreshToken: string | null;
  refreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<ModelProviderCredentialRecord[]>;
    };
  };
};

/**
 * Lists model provider credentials for the authenticated company resolved from the bearer token.
 */
export class ModelProviderCredentialsQueryResolver extends Resolver<ModelProviderCredentialRecord[]> {
  private readonly database: Pick<GraphqlAppRuntimeDatabase, "withContext">;

  constructor(database: Pick<GraphqlAppRuntimeDatabase, "withContext">) {
    super();
    this.database = database;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<ModelProviderCredentialRecord[]> => {
    return this.database.withContext(context, async ({ companyId, database }) => {
      const selectableDatabase = database as SelectableDatabase;
      return selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          updatedAt: modelProviderCredentials.updatedAt,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, companyId));
    });
  };
}
