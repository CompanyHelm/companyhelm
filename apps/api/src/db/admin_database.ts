import { drizzle } from "drizzle-orm/postgres-js";
import { inject, injectable } from "inversify";
import postgres, { type Sql } from "postgres";
import { Config } from "../config/schema.ts";
import type { DatabaseClientInterface, DatabaseInterface } from "./database_interface.ts";

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

  getDatabase(): DatabaseClientInterface {
    return this.database as DatabaseClientInterface;
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
