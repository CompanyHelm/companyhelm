import assert from "node:assert/strict";
import { test } from "vitest";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import { AgentTaskToolService } from "../src/services/agent/session/pi-mono/tools/tasks/service.ts";
import type { TaskServiceUpdateTaskStatusInput } from "../src/services/task_service.ts";

test("AgentTaskToolService forwards session-aware task status updates", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new AgentTaskToolService(
    {} as never,
    "company-1",
    "agent-1",
    "session-1",
    {
      async updateTaskStatus(
        _transactionProvider: TransactionProviderInterface,
        input: TaskServiceUpdateTaskStatusInput,
      ) {
        capturedInput = input as Record<string, unknown>;

        return {
          assignedAt: null,
          assignee: null,
          createdAt: new Date("2026-04-13T12:00:00.000Z"),
          description: null,
          id: "task-1",
          name: "Ship the task-run fix",
          status: "in_progress",
          taskStageId: null,
          taskStageName: null,
          updatedAt: new Date("2026-04-13T12:00:00.000Z"),
        };
      },
    } as never,
  );

  await service.updateTaskStatus({
    status: "in_progress",
    taskId: "task-1",
  });

  assert.deepEqual(capturedInput, {
    actorAgentId: "agent-1",
    companyId: "company-1",
    sessionId: "session-1",
    status: "in_progress",
    taskId: "task-1",
  });
});
