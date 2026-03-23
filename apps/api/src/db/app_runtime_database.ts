import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { inject, injectable } from "inversify";
import postgres from "postgres";
import type { AuthProviderDatabase } from "../auth/auth_provider.ts";
import { Config } from "../config/schema.ts";

/**
 * Owns the runtime Postgres connection used by the API process.
 */
@injectable()
export class AppRuntimeDatabase {
  private readonly sqlClient;
  private readonly database;

  constructor(@inject(Config) config: Config) {
    const runtimeRole = config.database.roles.app_runtime;
    this.sqlClient = postgres({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      username: runtimeRole.username,
      password: runtimeRole.password,
    });
    this.database = drizzle(this.sqlClient);
  }

  getDatabase() {
    return this.database as AuthProviderDatabase;
  }

  async applyCompanyContext(
    database: AuthProviderDatabase,
    companyId: string,
  ): Promise<void> {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      throw new Error("Company ID is required.");
    }

    const companyContextDatabase = database as AuthProviderDatabase & {
      execute?(query: unknown): Promise<unknown>;
    };
    if (typeof companyContextDatabase.execute !== "function") {
      throw new Error("Configured database does not support company context binding.");
    }

    await companyContextDatabase.execute(
      sql`select set_config('app.current_company_id', ${normalizedCompanyId}, true)`,
    );
  }

  async withCompanyContext<T>(
    companyId: string,
    callback: (database: AuthProviderDatabase) => Promise<T>,
  ): Promise<T> {
    return this.database.transaction(async (transaction) => {
      await this.applyCompanyContext(transaction as AuthProviderDatabase, companyId);
      return callback(transaction as AuthProviderDatabase);
    });
  }

  async close(): Promise<void> {
    await this.sqlClient.end({
      timeout: 5,
    });
  }
}
