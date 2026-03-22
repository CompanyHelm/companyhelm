import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { AuthProviderDatabase } from "../auth/providers/auth_provider_interface.ts";
import type { ConfigDocument } from "../config/schema.ts";

/**
 * Owns the runtime Postgres connection used by the API process.
 */
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

  async close(): Promise<void> {
    await this.sqlClient.end({
      timeout: 5,
    });
  }
}
