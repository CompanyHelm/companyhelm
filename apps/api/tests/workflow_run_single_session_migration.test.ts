import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Verifies the migration-level guard that keeps one chat session from owning multiple running
 * workflow runs even if application code misses the service-level preflight.
 */
class WorkflowRunSingleSessionMigrationTest {
  static readMigration(): string {
    return readFileSync(
      new URL("../drizzle/0123_single_running_workflow.sql", import.meta.url),
      "utf8",
    );
  }
}

test("workflow run migration enforces one running workflow per session", () => {
  const migration = WorkflowRunSingleSessionMigrationTest.readMigration();

  assert.match(
    migration,
    /CREATE UNIQUE INDEX "workflow_runs_running_session_id_uidx" ON "workflow_runs" USING btree \("session_id"\) WHERE "workflow_runs"\."status" = 'running'/u,
  );
});
