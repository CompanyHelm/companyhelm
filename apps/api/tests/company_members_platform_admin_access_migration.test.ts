import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("company members migration allows explicit platform admin access across company scopes", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0151_company_members_platform_admin_access.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /DROP POLICY IF EXISTS "company_members_platform_admin_access_policy" ON "company_members"/,
  );
  assert.match(
    migrationSql,
    /CREATE POLICY "company_members_platform_admin_access_policy"\s+ON "company_members"\s+AS PERMISSIVE\s+FOR ALL\s+TO public\s+USING \(current_setting\('app.platform_admin_access', true\) = 'true'\)\s+WITH CHECK \(current_setting\('app.platform_admin_access', true\) = 'true'\);/s,
  );
});
