import { drizzle } from "drizzle-orm/postgres-js";
import { inject, injectable } from "inversify";
import postgres, { type Sql } from "postgres";
import type { AuthProviderDatabase } from "../auth/auth_provider.ts";
import { Config } from "../config/schema.ts";
import type { DatabaseInterface } from "./database_interface.ts";

/**
 * Owns the admin-role Postgres connection used for startup-only schema and role management work.
 */
@injectable()
export class AdminDatabase implements DatabaseInterface {
  private readonly sqlClient: Sql;
  private readonly database;

  constructor(@inject(Config) config: Config) {
    const adminRole = config.database.roles.admin;
    this.sqlClient = postgres({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      username: adminRole.username,
      password: adminRole.password,
      max: 1,
    });
    this.database = drizzle(this.sqlClient);
  }

  getDatabase(): AuthProviderDatabase {
    return this.database as AuthProviderDatabase;
  }

  getSqlClient(): Sql {
    return this.sqlClient;
  }

  async close(): Promise<void> {
    await this.sqlClient.end({
      timeout: 5,
    });
  }
}
