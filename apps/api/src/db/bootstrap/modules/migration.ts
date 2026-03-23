import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Sql } from "postgres";

export async function runMigrationBootstrapModule(params: {
  migrationsFolder: string;
  runtimeRoleName: string;
  sqlClient: Sql;
}): Promise<void> {
  const db = drizzle(params.sqlClient);
  await params.sqlClient`SET statement_timeout = 0`;
  await params.sqlClient`
    SELECT set_config('app.runtime_role', ${params.runtimeRoleName}, false)
  `;

  try {
    await migrate(db, {
      migrationsFolder: params.migrationsFolder,
    });
  } finally {
    await params.sqlClient`RESET statement_timeout`;
  }
}
