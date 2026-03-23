import { eq } from "drizzle-orm";
import { decorate, inject, injectable } from "inversify";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { modelProviderCredentials } from "../../db/schema.ts";
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
@injectable("Singleton")
export class ModelProviderCredentialsQueryResolver extends Resolver<ModelProviderCredentialRecord[]> {
  private readonly database: Pick<AppRuntimeDatabase, "getDatabase">;

  constructor(database: Pick<AppRuntimeDatabase, "getDatabase">) {
    super();
    this.database = database;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<ModelProviderCredentialRecord[]> => {
    const companyId = String(context.authSession?.company?.id || "").trim();
    if (!companyId) {
      throw new Error("Authentication required.");
    }

    const database = this.database.getDatabase() as SelectableDatabase;
    return database
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
  };
}

decorate(inject(AppRuntimeDatabase), ModelProviderCredentialsQueryResolver, 0);
