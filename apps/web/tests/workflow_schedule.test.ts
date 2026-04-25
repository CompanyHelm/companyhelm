import assert from "node:assert/strict";
import { test } from "node:test";
import { WorkflowSchedule } from "../src/pages/workflows/workflow_schedule";

test("WorkflowSchedule parses weekday cron into a weekly editor draft", () => {
  const draft = WorkflowSchedule.fromCronPattern("0 9 * * 1-5");

  assert.equal(draft.mode, "weekly");
  assert.equal(draft.hour, 9);
  assert.equal(draft.minute, 0);
  assert.deepEqual(draft.weekdays, ["1", "2", "3", "4", "5"]);
});

test("WorkflowSchedule formats weekly draft back into compact cron", () => {
  const draft = WorkflowSchedule.fromCronPattern("15 14 * * 1,2,3,4,5");

  assert.equal(WorkflowSchedule.toCronPattern(draft), "15 14 * * 1-5");
});

test("WorkflowSchedule keeps unsupported cron expressions in advanced mode", () => {
  const draft = WorkflowSchedule.fromCronPattern("*/10 9-17 * * 1-5");

  assert.equal(draft.mode, "advanced");
  assert.equal(WorkflowSchedule.toCronPattern(draft), "*/10 9-17 * * 1-5");
  assert.equal(
    WorkflowSchedule.formatSummary(draft.cronPattern, "UTC"),
    "Runs on a custom schedule UTC",
  );
});

test("WorkflowSchedule summarizes common schedules in readable language", () => {
  assert.equal(
    WorkflowSchedule.formatSummary("0 9 * * 1-5", "America/Los_Angeles"),
    "Runs every weekday at 09:00 America/Los_Angeles",
  );
  assert.equal(
    WorkflowSchedule.formatSummary("30 * * * *", "UTC"),
    "Runs hourly at minute 30 UTC",
  );
});
