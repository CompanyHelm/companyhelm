import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ConfigLoader } from "../config/loader.ts";
import type { AppConfigDocument } from "../config/schema.ts";

/**
 * Owns the runtime Postgres connection used by the API process.
 */
export class AppRuntimeDatabase {
  private readonly sqlClient;
  private readonly database;

  constructor(config: Pick<ConfigLoader<AppConfigDocument>, "getDocument">) {
    const document = config.getDocument();
    const runtimeRole = document.database.roles.app_runtime;
    this.sqlClient = postgres({
      host: document.database.host,
      port: document.database.port,
      database: document.database.name,
      username: runtimeRole.username,
      password: runtimeRole.password,
    });
    this.database = drizzle(this.sqlClient);
  }

  getDatabase() {
    return this.database;
  }

  async close(): Promise<void> {
    await this.sqlClient.end({
      timeout: 5,
    });
  }
}
