import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { RoutineSchedulerSyncService } from "../src/services/routines/scheduler_sync.ts";

test("RoutineSchedulerSyncService upserts every enabled cron schedule from the admin scan", async () => {
  const removeTrigger = vi.fn(async () => undefined);
  const upsertCronTrigger = vi.fn(async () => undefined);
  const sql = vi.fn(async () => [
    {
      companyId: "company-1",
      cronPattern: "0 9 * * 1-5",
      endAt: null,
      id: "trigger-1",
      limit: null,
      routineId: "routine-1",
      routineEnabled: true,
      startAt: null,
      timezone: "America/Los_Angeles",
      triggerEnabled: true,
    },
    {
      companyId: "company-2",
      cronPattern: "30 14 * * *",
      endAt: new Date("2026-05-01T00:00:00.000Z"),
      id: "trigger-2",
      limit: 2,
      routineId: "routine-2",
      routineEnabled: true,
      startAt: new Date("2026-04-20T00:00:00.000Z"),
      timezone: "UTC",
      triggerEnabled: true,
    },
    {
      companyId: "company-3",
      cronPattern: "0 8 * * *",
      endAt: null,
      id: "trigger-3",
      limit: null,
      routineId: "routine-3",
      routineEnabled: false,
      startAt: null,
      timezone: "UTC",
      triggerEnabled: true,
    },
  ]);
  const service = new RoutineSchedulerSyncService(
    {
      getSqlClient() {
        return sql;
      },
    } as never,
    {
      removeTrigger,
      upsertCronTrigger,
    } as never,
  );

  await service.syncEnabledCronTriggers();

  assert.equal(sql.mock.calls.length, 1);
  assert.equal(upsertCronTrigger.mock.calls.length, 2);
  assert.deepEqual(removeTrigger.mock.calls[0], ["trigger-3"]);
  const upsertCalls = upsertCronTrigger.mock.calls as unknown[][];
  assert.deepEqual(upsertCalls[0]?.[0], {
    companyId: "company-1",
    cronPattern: "0 9 * * 1-5",
    endAt: null,
    id: "trigger-1",
    limit: null,
    routineId: "routine-1",
    startAt: null,
    timezone: "America/Los_Angeles",
  });
  assert.deepEqual(upsertCalls[1]?.[0], {
    companyId: "company-2",
    cronPattern: "30 14 * * *",
    endAt: new Date("2026-05-01T00:00:00.000Z"),
    id: "trigger-2",
    limit: 2,
    routineId: "routine-2",
    startAt: new Date("2026-04-20T00:00:00.000Z"),
    timezone: "UTC",
  });
});

test("RoutineSchedulerSyncService removes disabled cron schedules during targeted sync", async () => {
  const removeTrigger = vi.fn(async () => undefined);
  const upsertCronTrigger = vi.fn(async () => undefined);
  const service = new RoutineSchedulerSyncService({} as never, {
    removeTrigger,
    upsertCronTrigger,
  } as never);

  await service.syncCronTrigger(null, "trigger-1");

  assert.equal(upsertCronTrigger.mock.calls.length, 0);
  assert.deepEqual(removeTrigger.mock.calls[0], ["trigger-1"]);
});
