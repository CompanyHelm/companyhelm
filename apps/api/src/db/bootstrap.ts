import { resolve } from "node:path";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { AdminDatabase } from "./admin_database.ts";
import { runAppRuntimeRoleBootstrapModule } from "./bootstrap/modules/app-runtime-role.ts";
import { runMigrationBootstrapModule } from "./bootstrap/modules/migration.ts";

const DB_BOOTSTRAP_LOCK_NAMESPACE = 23241;
const DB_BOOTSTRAP_LOCK_ID = 1;

/**
 * Coordinates startup-only database work behind a session-level advisory lock so concurrent API
 * instances do not race while creating the runtime role and applying migrations.
 */
@injectable()
export class DbBootstrap {
  private readonly adminDatabase: AdminDatabase;
  private readonly config: Config;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(Config) config: Config,
  ) {
    this.adminDatabase = adminDatabase;
    this.config = config;
  }

  /**
   * Creates the runtime role when missing and then runs Drizzle migrations using the admin role on
   * the same locked session.
   */
  async run(): Promise<void> {
    const runtimeRole = this.config.database.roles.app_runtime;
    const sqlClient = this.adminDatabase.getSqlClient();
    let lockHeld = false;

    try {
      const lockResult = await sqlClient<{ locked: boolean }[]>`
        SELECT pg_try_advisory_lock(${DB_BOOTSTRAP_LOCK_NAMESPACE}, ${DB_BOOTSTRAP_LOCK_ID}) AS locked
      `;
      lockHeld = lockResult[0]?.locked === true;

      if (!lockHeld) {
        await sqlClient`
          SELECT pg_advisory_lock(${DB_BOOTSTRAP_LOCK_NAMESPACE}, ${DB_BOOTSTRAP_LOCK_ID})
        `;
        lockHeld = true;
      }

      await runAppRuntimeRoleBootstrapModule({
        roleName: runtimeRole.username,
        rolePassword: runtimeRole.password,
        sqlClient,
      });

      await runMigrationBootstrapModule({
        migrationsFolder: resolve(process.cwd(), "drizzle"),
        runtimeRoleName: runtimeRole.username,
        sqlClient,
      });
    } finally {
      if (lockHeld) {
        await sqlClient`
          SELECT pg_advisory_unlock(${DB_BOOTSTRAP_LOCK_NAMESPACE}, ${DB_BOOTSTRAP_LOCK_ID})
        `;
      }

      await this.adminDatabase.close();
    }
  }
}
