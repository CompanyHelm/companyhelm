import { inject, injectable } from "inversify";
import { AdminDatabase } from "../admin_database.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import type { BootstrapModuleInterface } from "./bootstrap_module_interface.ts";
import { AppRuntimeRoleBootstrapModule } from "./modules/app-runtime-role.ts";
import { MigrationBootstrapModule } from "./modules/migration.ts";

const DB_BOOTSTRAP_LOCK_NAMESPACE = 23241;
const DB_BOOTSTRAP_LOCK_ID = 1;

/**
 * Coordinates startup-only database work behind a session-level advisory lock so concurrent API
 * instances do not race while creating the runtime role and applying migrations.
 */
@injectable()
export class DbBootstrap {
  private readonly adminDatabase: AdminDatabase;
  private readonly appRuntimeRoleBootstrapModule: BootstrapModuleInterface;
  private readonly migrationBootstrapModule: BootstrapModuleInterface;
  private readonly logger;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(AppRuntimeRoleBootstrapModule) appRuntimeRoleBootstrapModule: BootstrapModuleInterface,
    @inject(MigrationBootstrapModule) migrationBootstrapModule: BootstrapModuleInterface,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    this.adminDatabase = adminDatabase;
    this.appRuntimeRoleBootstrapModule = appRuntimeRoleBootstrapModule;
    this.migrationBootstrapModule = migrationBootstrapModule;
    this.logger = logger.child({
      component: "db_bootstrap",
    });
  }

  /**
   * Creates the runtime role when missing and then runs Drizzle migrations using the admin role on
   * the same locked session.
   */
  async run(): Promise<void> {
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

      await this.runModule("app_runtime_role", this.appRuntimeRoleBootstrapModule);
      await this.runModule("migration", this.migrationBootstrapModule);
    } finally {
      if (lockHeld) {
        await sqlClient`
          SELECT pg_advisory_unlock(${DB_BOOTSTRAP_LOCK_NAMESPACE}, ${DB_BOOTSTRAP_LOCK_ID})
        `;
      }
    }
  }

  private async runModule(moduleName: string, module: BootstrapModuleInterface): Promise<void> {
    this.logger.info({
      module: moduleName,
    }, "starting db bootstrap module");
    this.logger.info({
      module: moduleName,
    }, "running db bootstrap module");
    await module.run();
    this.logger.info({
      module: moduleName,
    }, "completed db bootstrap module");
  }
}
