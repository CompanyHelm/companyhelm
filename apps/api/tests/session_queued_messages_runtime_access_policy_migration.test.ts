import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("session queued message runtime access migration creates company-scope policies for queue tables", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0065_session_queued_messages_company_scope_policy.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "session_queued_messages" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migrationSql,
    /FROM pg_policies\s+WHERE schemaname = 'public'\s+AND tablename = 'session_queued_messages'/,
  );
  assert.match(
    migrationSql,
    /CREATE POLICY "session_queued_messages_company_scope_policy"/,
  );
  assert.match(
    migrationSql,
    /ON "session_queued_messages"[\s\S]*FOR ALL[\s\S]*TO public[\s\S]*"company_id" = current_setting\('app\.current_company_id', true\)::uuid/s,
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "session_queued_message_images" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migrationSql,
    /FROM pg_policies\s+WHERE schemaname = 'public'\s+AND tablename = 'session_queued_message_images'/,
  );
  assert.match(
    migrationSql,
    /CREATE POLICY "session_queued_message_images_company_scope_policy"/,
  );
  assert.match(
    migrationSql,
    /ON "session_queued_message_images"[\s\S]*FOR ALL[\s\S]*TO public[\s\S]*"company_id" = current_setting\('app\.current_company_id', true\)::uuid/s,
  );
});
