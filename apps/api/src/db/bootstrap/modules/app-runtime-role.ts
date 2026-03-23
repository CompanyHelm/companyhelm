import { inject, injectable } from "inversify";
import { Config } from "../../../config/schema.ts";
import { AdminDatabase } from "../../admin_database.ts";
import type { BootstrapModuleInterface } from "../bootstrap_module_interface.ts";

/**
 * Ensures the configured app runtime role exists before request-serving code starts using it.
 */
@injectable()
export class AppRuntimeRoleBootstrapModule implements BootstrapModuleInterface {
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
    const roleName = this.normalizeRoleName(this.config.database.roles.app_runtime.username);
    const rolePassword = String(this.config.database.roles.app_runtime.password || "").trim();
    if (!rolePassword) {
      throw new Error("Role password cannot be empty.");
    }

    const sqlClient = this.adminDatabase.getSqlClient();
    const existingRoleResult = await sqlClient<{ exists: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${roleName}) AS exists
    `;
    if (existingRoleResult[0]?.exists !== true) {
      await sqlClient.unsafe(
        `CREATE ROLE ${this.quoteIdentifier(roleName)} LOGIN PASSWORD ${this.quoteLiteral(rolePassword)}`,
      );
    }

    await this.reconcilePrivileges(roleName);
  }

  private normalizeRoleName(roleName: string): string {
    const normalizedRoleName = String(roleName || "").trim();
    if (!normalizedRoleName) {
      throw new Error("Role name cannot be empty.");
    }

    return normalizedRoleName;
  }

  private quoteIdentifier(value: string): string {
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  private quoteLiteral(value: string): string {
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * Reapplies the runtime-role grants on every startup so a recreated role or drifted local
   * database does not leave request-time auth queries without access to bootstrap tables.
   */
  private async reconcilePrivileges(roleName: string): Promise<void> {
    const sqlClient = this.adminDatabase.getSqlClient();
    const quotedRoleName = this.quoteIdentifier(roleName);

    await sqlClient.unsafe(`REVOKE ALL PRIVILEGES ON SCHEMA public FROM ${quotedRoleName}`);
    await sqlClient.unsafe(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${quotedRoleName}`);
    await sqlClient.unsafe(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${quotedRoleName}`);
    await sqlClient.unsafe(`REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM ${quotedRoleName}`);
    await sqlClient.unsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM ${quotedRoleName}`,
    );
    await sqlClient.unsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM ${quotedRoleName}`,
    );
    await sqlClient.unsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM ${quotedRoleName}`,
    );
    await sqlClient.unsafe(`GRANT USAGE ON SCHEMA public TO ${quotedRoleName}`);
    await sqlClient.unsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quotedRoleName}`,
    );
    await sqlClient.unsafe(
      `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${quotedRoleName}`,
    );
    await sqlClient.unsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quotedRoleName}`,
    );
    await sqlClient.unsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${quotedRoleName}`,
    );
  }
}
