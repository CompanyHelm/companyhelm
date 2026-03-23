import { resolve } from "node:path";
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
    await sqlClient`SET statement_timeout = 0`;
    await sqlClient`
      SELECT set_config('app.runtime_role', ${this.config.database.roles.app_runtime.username}, false)
    `;

    try {
      await migrate(this.adminDatabase.getDatabase() as never, {
        migrationsFolder: resolve(process.cwd(), "drizzle"),
      });
    } finally {
      await sqlClient`RESET statement_timeout`;
    }
  }
}
