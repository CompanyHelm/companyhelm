import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type Config } from "../config/schema.ts";

/**
 * Executes database bootstrap work that must finish before request handling begins.
 */
export class DbBootstrap {
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Applies the checked-in Drizzle migrations using the configured admin role so the runtime schema
   * is ready before the app runtime role starts serving queries.
   */
  async run(): Promise<void> {
    const adminRole = this.config.database.roles.admin;
    const sqlClient = postgres({
      host: this.config.database.host,
      port: this.config.database.port,
      database: this.config.database.name,
      username: adminRole.username,
      password: adminRole.password,
      max: 1,
    });

    try {
      const database = drizzle(sqlClient);
      await migrate(database, {
        migrationsFolder: resolve(process.cwd(), "drizzle"),
      });
    } finally {
      await sqlClient.end({
        timeout: 5,
      });
    }
  }
}
