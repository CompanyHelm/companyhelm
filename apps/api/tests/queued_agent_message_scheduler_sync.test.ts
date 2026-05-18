import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { QueuedAgentMessageSchedulerSyncService } from "../src/services/schedules/queued_agent_message_scheduler_sync.ts";

test("QueuedAgentMessageSchedulerSyncService upserts every enabled queued-message schedule from the admin scan", async () => {
  const removeSchedule = vi.fn(async () => undefined);
  const upsertCronSchedule = vi.fn(async () => undefined);
  const sql = vi.fn(async () => [
    {
      companyId: "company-1",
      cronPattern: "0 9 * * 1-5",
      enabled: true,
      id: "schedule-1",
      timezone: "America/Los_Angeles",
    },
    {
      companyId: "company-2",
      cronPattern: "30 14 * * *",
      enabled: false,
      id: "schedule-2",
      timezone: "UTC",
    },
  ]);
  const service = new QueuedAgentMessageSchedulerSyncService(
    {
      getSqlClient() {
        return sql;
      },
    } as never,
    {
      removeSchedule,
      upsertCronSchedule,
    } as never,
  );

  await service.syncEnabledSchedules();

  assert.equal(sql.mock.calls.length, 1);
  assert.deepEqual(upsertCronSchedule.mock.calls[0]?.[0], {
    companyId: "company-1",
    cronPattern: "0 9 * * 1-5",
    scheduleId: "schedule-1",
    scheduleType: "queued_agent_message",
    timezone: "America/Los_Angeles",
  });
  assert.deepEqual(removeSchedule.mock.calls[0], ["schedule-2"]);
});
