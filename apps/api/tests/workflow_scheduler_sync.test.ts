import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { WorkflowSchedulerSyncService } from "../src/services/workflows/scheduler_sync.ts";

test("WorkflowSchedulerSyncService upserts every enabled cron schedule from the admin scan", async () => {
  const removeTrigger = vi.fn(async () => undefined);
  const upsertCronTrigger = vi.fn(async () => undefined);
  const sql = vi.fn(async () => [
    {
      agentId: "agent-1",
      companyId: "company-1",
      cronPattern: "0 9 * * 1-5",
      id: "trigger-1",
      timezone: "America/Los_Angeles",
      triggerEnabled: true,
      workflowDefinitionId: "workflow-1",
      workflowEnabled: true,
    },
    {
      agentId: "agent-2",
      companyId: "company-2",
      cronPattern: "30 14 * * *",
      id: "trigger-2",
      timezone: "UTC",
      triggerEnabled: true,
      workflowDefinitionId: "workflow-2",
      workflowEnabled: false,
    },
  ]);
  const service = new WorkflowSchedulerSyncService(
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
  assert.equal(upsertCronTrigger.mock.calls.length, 1);
  const upsertCalls = upsertCronTrigger.mock.calls as unknown[][];
  assert.deepEqual(upsertCalls[0]?.[0], {
    agentId: "agent-1",
    companyId: "company-1",
    cronPattern: "0 9 * * 1-5",
    id: "trigger-1",
    timezone: "America/Los_Angeles",
    workflowDefinitionId: "workflow-1",
  });
  assert.deepEqual(removeTrigger.mock.calls[0], ["trigger-2"]);
});

test("WorkflowSchedulerSyncService removes disabled cron schedules during targeted sync", async () => {
  const removeTrigger = vi.fn(async () => undefined);
  const upsertCronTrigger = vi.fn(async () => undefined);
  const service = new WorkflowSchedulerSyncService({} as never, {
    removeTrigger,
    upsertCronTrigger,
  } as never);

  await service.syncCronTrigger(null, "trigger-1");

  assert.equal(upsertCronTrigger.mock.calls.length, 0);
  assert.deepEqual(removeTrigger.mock.calls[0], ["trigger-1"]);
});
