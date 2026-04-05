import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("compute provider runtime access migration replaces stray compute provider policies with company-scoped access", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0063_compute_provider_definitions_company_scope_policy.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "compute_provider_definitions" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migrationSql,
    /ALTER TABLE "daytona_compute_provider_definitions" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migrationSql,
    /ALTER TABLE "e2b_compute_provider_definitions" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migrationSql,
    /FROM pg_policies\s+WHERE schemaname = 'public'\s+AND tablename = 'compute_provider_definitions'/,
  );
  assert.match(
    migrationSql,
    /FROM pg_policies\s+WHERE schemaname = 'public'\s+AND tablename = 'daytona_compute_provider_definitions'/,
  );
  assert.match(
    migrationSql,
    /FROM pg_policies\s+WHERE schemaname = 'public'\s+AND tablename = 'e2b_compute_provider_definitions'/,
  );
  assert.match(
    migrationSql,
    /CREATE POLICY "compute_provider_definitions_company_scope_policy"/,
  );
  assert.match(
    migrationSql,
    /ON "compute_provider_definitions"\s+AS PERMISSIVE\s+FOR ALL\s+TO public\s+USING \("company_id" = current_setting\('app.current_company_id', true\)::uuid\)\s+WITH CHECK \("company_id" = current_setting\('app.current_company_id', true\)::uuid\);/s,
  );
  assert.match(
    migrationSql,
    /CREATE POLICY "daytona_compute_provider_definitions_company_scope_policy"/,
  );
  assert.match(
    migrationSql,
    /CREATE POLICY "e2b_compute_provider_definitions_company_scope_policy"/,
  );
  assert.match(
    migrationSql,
    /WHERE "cpd"\."id" = "daytona_compute_provider_definitions"\."compute_provider_definition_id"\s+AND "cpd"\."company_id" = current_setting\('app.current_company_id', true\)::uuid/s,
  );
  assert.match(
    migrationSql,
    /WHERE "cpd"\."id" = "e2b_compute_provider_definitions"\."compute_provider_definition_id"\s+AND "cpd"\."company_id" = current_setting\('app.current_company_id', true\)::uuid/s,
  );
});
