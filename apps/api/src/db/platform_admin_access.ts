import { sql } from "drizzle-orm";

type ExecutableDatabase = {
  execute?(query: unknown): Promise<unknown>;
};

/**
 * Marks a single database transaction as trusted to read or mutate platform-admin-owned rows.
 * Platform resources have no company scope, so their RLS policies use this explicit transaction
 * flag instead of relying on the normal company-bound context.
 */
export class PlatformAdminAccess {
  static async enable(database: ExecutableDatabase): Promise<void> {
    if (typeof database.execute !== "function") {
      throw new Error("Configured database does not support platform admin access binding.");
    }

    await database.execute(sql`select set_config('app.platform_admin_access', 'true', true)`);
  }
}
