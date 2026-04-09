import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("plain nebula migration only adds the skills schema delta", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0075_plain_nebula.sql", import.meta.url),
    "utf8",
  );

  assert.match(migrationSql, /CREATE TABLE "skill_groups"/);
  assert.match(migrationSql, /CREATE TABLE "skills"/);

  assert.doesNotMatch(migrationSql, /session_context_checkpoints/);
  assert.doesNotMatch(migrationSql, /session_queued_message_contents/);
  assert.doesNotMatch(migrationSql, /forked_from_turn_id/);
  assert.doesNotMatch(migrationSql, /default_environment_template_id/);
  assert.doesNotMatch(migrationSql, /template_id/);
  assert.doesNotMatch(migrationSql, /claimed_at/);
  assert.doesNotMatch(migrationSql, /dispatched_at/);
  assert.doesNotMatch(migrationSql, /legacy_compute_provider_definitions/);
  assert.doesNotMatch(migrationSql, /agent_environment_requirements/);
});
