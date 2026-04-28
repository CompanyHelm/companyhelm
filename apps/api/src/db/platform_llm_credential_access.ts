import { sql } from "drizzle-orm";

type ExecutableDatabase = {
  execute?(query: unknown): Promise<unknown>;
};

/**
 * Marks a single database transaction as trusted to read or mutate CompanyHelm-owned LLM
 * credential rows. Platform credentials have no company scope, so their RLS policy uses this
 * explicit transaction flag instead of relying on the normal company-bound context.
 */
export class PlatformLlmCredentialAccess {
  static async enable(database: ExecutableDatabase): Promise<void> {
    if (typeof database.execute !== "function") {
      throw new Error("Configured database does not support platform LLM credential access binding.");
    }

    await database.execute(sql`select set_config('app.platform_llm_credential_access', 'true', true)`);
  }
}
