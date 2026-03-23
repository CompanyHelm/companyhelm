import { inject, injectable } from "inversify";
import type { AuthProviderDatabase } from "../auth/auth_provider.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import type { GraphqlRequestContext } from "./graphql_request_context.ts";

/**
 * Adapts the shared runtime database to GraphQL request context so tenant-scoped operations always
 * run with the authenticated company bound into the database transaction.
 */
@injectable()
export class GraphqlAppRuntimeDatabase {
  private readonly database: AppRuntimeDatabase;

  constructor(@inject(AppRuntimeDatabase) database: AppRuntimeDatabase) {
    this.database = database;
  }

  async withContext<T>(
    context: GraphqlRequestContext,
    callback: (params: {
      companyId: string;
      database: AuthProviderDatabase;
    }) => Promise<T>,
  ): Promise<T> {
    const companyId = String(context.authSession?.company?.id || "").trim();
    if (!companyId) {
      throw new Error("Authentication required.");
    }

    return this.database.withCompanyContext(companyId, async (database) => {
      return callback({
        companyId,
        database,
      });
    });
  }
}
