import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("companies runtime access migration replaces stray companies policies with one explicit permissive policy", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0062_companies_runtime_access_policy.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migrationSql,
    /FROM pg_policies\s+WHERE schemaname = 'public'\s+AND tablename = 'companies'/,
  );
  assert.match(
    migrationSql,
    /DROP POLICY IF EXISTS %I ON "companies"/,
  );
  assert.match(
    migrationSql,
    /CREATE POLICY "companies_runtime_access_policy"/,
  );
  assert.match(
    migrationSql,
    /FOR ALL\s+TO public\s+USING \(true\)\s+WITH CHECK \(true\);/s,
  );
});
