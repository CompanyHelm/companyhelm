import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MigrationBootstrapModule } from "../src/db/bootstrap/modules/migration.ts";

describe("MigrationBootstrapModule", () => {
  it("resolves the checked-in drizzle folder independent of process cwd", () => {
    const migrationsFolder = MigrationBootstrapModule.getMigrationsFolderPath();

    expect(migrationsFolder.endsWith("/apps/api/drizzle")).toBe(true);
    expect(existsSync(migrationsFolder)).toBe(true);
  });
});
