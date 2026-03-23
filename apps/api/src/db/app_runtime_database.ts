import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { decorate, inject, injectable } from "inversify";
import postgres from "postgres";
import type { AuthProviderDatabase } from "../auth/auth_provider.ts";
import { Config, type ConfigDocument } from "../config/schema.ts";

/**
 * Owns the runtime Postgres connection used by the API process.
 */
@injectable("Singleton")
export class AppRuntimeDatabase {
  private readonly sqlClient;
  private readonly database;

  constructor(config: ConfigDocument) {
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

  async withCompanyContext<T>(
    companyId: string,
    callback: (database: AuthProviderDatabase) => Promise<T>,
  ): Promise<T> {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      throw new Error("Company ID is required.");
    }

    return this.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select set_config('app.current_company_id', ${normalizedCompanyId}, true)`,
      );

      return callback(transaction as AuthProviderDatabase);
    });
  }

  async close(): Promise<void> {
    await this.sqlClient.end({
      timeout: 5,
    });
  }
}

decorate(inject(Config), AppRuntimeDatabase, 0);
