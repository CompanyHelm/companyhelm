import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("session queued message contents migration replaces image side table with content parts", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0069_session_queued_message_contents.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /DROP TABLE IF EXISTS "session_queued_message_images";/,
  );
  assert.match(
    migrationSql,
    /ALTER TABLE "session_queued_messages" DROP COLUMN IF EXISTS "text";/,
  );
  assert.match(
    migrationSql,
    /CREATE TABLE "session_queued_message_contents"/,
  );
  assert.match(
    migrationSql,
    /"type" "message_content_type" NOT NULL/,
  );
  assert.match(
    migrationSql,
    /ALTER TABLE "session_queued_message_contents" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migrationSql,
    /FROM pg_policies\s+WHERE schemaname = 'public'\s+AND tablename = 'session_queued_message_contents'/,
  );
  assert.match(
    migrationSql,
    /CREATE POLICY "session_queued_message_contents_company_scope_policy"/,
  );
  assert.match(
    migrationSql,
    /ON "session_queued_message_contents"[\s\S]*FOR ALL[\s\S]*TO public[\s\S]*"company_id" = current_setting\('app\.current_company_id', true\)::uuid/s,
  );
});
