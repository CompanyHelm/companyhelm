import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("session messages migration adds the error_message column", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0087_session_messages_error_message.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "session_messages" ADD COLUMN "error_message" text;/,
  );
});
