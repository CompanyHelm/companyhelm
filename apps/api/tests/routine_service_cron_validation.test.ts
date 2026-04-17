import assert from "node:assert/strict";
import { test } from "vitest";
import { RoutineService } from "../src/services/routines/service.ts";

type RoutineCronValidator = {
  assertCron(cronPattern: string, timezone: string): void;
};

test("RoutineService validates cron schedules through the installed cron parser runtime", () => {
  const service = new RoutineService() as unknown as RoutineCronValidator;

  assert.doesNotThrow(() => {
    service.assertCron("0 9 * * 1-5", "America/Los_Angeles");
  });
  assert.throws(
    () => {
      service.assertCron("not a cron expression", "UTC");
    },
    /Invalid cron trigger schedule/u,
  );
});
