import assert from "node:assert/strict";
import { test } from "vitest";
import { TaskService } from "../src/services/task_service.ts";

type InsertedTaskRunRow = {
  agentId: string;
  companyId: string;
  createdAt: Date;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  endedReason: string | null;
  finishedAt: Date | null;
  id: string;
  lastActivityAt: Date;
  sessionId: string | null;
  startedAt: Date | null;
  status: string;
  taskId: string;
  updatedAt: Date;
};

/**
 * Mimics the task-run insert path closely enough to prove that repeated session-driven
 * in-progress transitions rely on onConflictDoNothing semantics instead of creating duplicates.
 */
class TaskRunInsertRecorder {
  readonly insertedRows: InsertedTaskRunRow[] = [];

  insert() {
    return {
      values: (value: InsertedTaskRunRow) => ({
        onConflictDoNothing: async () => {
          const hasMatchingSession = this.insertedRows.some((row) => row.sessionId === value.sessionId);
          const hasOpenRunForTask = this.insertedRows.some((row) => row.taskId === value.taskId && row.finishedAt === null);

          if (!hasMatchingSession && !hasOpenRunForTask) {
            this.insertedRows.push(value);
          }
        },
      }),
    };
  }
}

test("TaskService creates at most one open task run for repeated session-driven in-progress transitions", async () => {
  const taskService = new TaskService() as TaskService & {
    ensureSessionTaskRunForInProgress: (
      tx: { insert: () => ReturnType<TaskRunInsertRecorder["insert"]> },
      input: {
        actorAgentId: string | null;
        companyId: string;
        nextAssignedAgentId: string | null;
        nextAssignedUserId: string | null;
        nextStatus: "draft" | "in_progress" | "completed";
        sessionId: string | null;
        taskId: string;
      },
    ) => Promise<void>;
  };
  const recorder = new TaskRunInsertRecorder();
  const input = {
    actorAgentId: "agent-1",
    companyId: "company-1",
    nextAssignedAgentId: "agent-1",
    nextAssignedUserId: null,
    nextStatus: "in_progress" as const,
    sessionId: "session-1",
    taskId: "task-1",
  };

  await taskService.ensureSessionTaskRunForInProgress(recorder as never, input);
  await taskService.ensureSessionTaskRunForInProgress(recorder as never, input);

  assert.equal(recorder.insertedRows.length, 1);
  assert.equal(recorder.insertedRows[0]?.sessionId, "session-1");
  assert.equal(recorder.insertedRows[0]?.taskId, "task-1");
  assert.equal(recorder.insertedRows[0]?.createdByAgentId, "agent-1");
  assert.equal(recorder.insertedRows[0]?.status, "running");
});
