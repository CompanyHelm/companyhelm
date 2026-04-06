import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { inject, injectable } from "inversify";
import { Config } from "../../../config/schema.ts";
import { AdminDatabase } from "../../admin_database.ts";
import type { BootstrapModuleInterface } from "../bootstrap_module_interface.ts";

/**
 * Applies the checked-in Drizzle migrations through the admin database session.
 */
@injectable()
export class MigrationBootstrapModule implements BootstrapModuleInterface {
  private static readonly migrationsFolderPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../drizzle",
  );

  private readonly adminDatabase: AdminDatabase;
  private readonly config: Config;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(Config) config: Config,
  ) {
    this.adminDatabase = adminDatabase;
    this.config = config;
  }

  async run(): Promise<void> {
    const sqlClient = this.adminDatabase.getSqlClient();
    const migrationsFolder = MigrationBootstrapModule.migrationsFolderPath;
    if (!existsSync(migrationsFolder)) {
      throw new Error(`Drizzle migrations folder not found at "${migrationsFolder}".`);
    }

    await sqlClient`SET statement_timeout = 0`;
    await sqlClient`
      SELECT set_config('app.runtime_role', ${this.config.database.roles.app_runtime.username}, false)
    `;

    try {
      await migrate(this.adminDatabase.getDatabase() as never, {
        migrationsFolder,
      });
    } finally {
      await sqlClient`RESET statement_timeout`;
    }
  }

  static getMigrationsFolderPath(): string {
    return this.migrationsFolderPath;
  }
}
