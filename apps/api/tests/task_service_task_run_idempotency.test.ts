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

class StartTaskTransactionRecorder {
  readonly insertedTaskRuns: Record<string, unknown>[] = [];
  readonly updatedTasks: Record<string, unknown>[] = [];
  private readonly initialTaskRow: Record<string, unknown>;
  private readonly updatedTaskRow: Record<string, unknown>;
  private selectCalls = 0;

  constructor(input: {
    initialTaskRow: Record<string, unknown>;
    updatedTaskRow?: Record<string, unknown>;
  }) {
    this.initialTaskRow = input.initialTaskRow;
    this.updatedTaskRow = input.updatedTaskRow ?? input.initialTaskRow;
  }

  buildTransactionProvider() {
    return {
      transaction: async (callback: (tx: StartTaskTransactionRecorder) => Promise<unknown>) => {
        return callback(this);
      },
    };
  }

  select() {
    this.selectCalls += 1;
    const callNumber = this.selectCalls;

    return {
      from: () => ({
        where: async () => this.resolveSelectRows(callNumber),
      }),
    };
  }

  update() {
    return {
      set: (value: Record<string, unknown>) => {
        this.updatedTasks.push(value);

        return {
          where: () => ({
            returning: async () => [this.updatedTaskRow],
          }),
        };
      },
    };
  }

  insert() {
    return {
      values: (value: Record<string, unknown>) => {
        this.insertedTaskRuns.push(value);

        return {
          returning: async () => [{
            agentId: "agent-1",
            createdAt: new Date("2026-04-20T12:30:00.000Z"),
            finishedAt: null,
            id: "task-run-1",
            sessionId: "session-1",
            startedAt: new Date("2026-04-20T12:30:00.000Z"),
            status: "running",
            taskId: "task-1",
            updatedAt: new Date("2026-04-20T12:30:00.000Z"),
          }],
        };
      },
    };
  }

  private resolveSelectRows(callNumber: number): unknown[] {
    if (callNumber === 1) {
      return [this.initialTaskRow];
    }
    if (callNumber === 2 || callNumber === 3) {
      return [];
    }
    if (callNumber === 4) {
      return [{
        id: "stage-1",
        name: "Backlog",
      }];
    }

    return [{
      id: "agent-1",
      name: "Engineer",
    }];
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

test("TaskService.startTask creates a run for an already in-progress task assigned to the current agent", async () => {
  const taskService = new TaskService();
  const recorder = new StartTaskTransactionRecorder({
    initialTaskRow: {
      assignedAgentId: "agent-1",
      assignedAt: new Date("2026-04-20T12:00:00.000Z"),
      assignedUserId: null,
      completedAt: null,
      createdAt: new Date("2026-04-20T12:00:00.000Z"),
      description: null,
      id: "task-1",
      name: "Ship the change",
      status: "in_progress",
      taskStageId: "stage-1",
      updatedAt: new Date("2026-04-20T12:00:00.000Z"),
    },
  });

  const result = await taskService.startTask(recorder.buildTransactionProvider() as never, {
    actorAgentId: "agent-1",
    companyId: "company-1",
    sessionId: "session-1",
    taskId: "task-1",
  });

  assert.equal(result.task.id, "task-1");
  assert.equal(result.task.status, "in_progress");
  assert.equal(result.taskRun.id, "task-run-1");
  assert.equal(recorder.updatedTasks.length, 0);
  assert.equal(recorder.insertedTaskRuns.length, 1);
  assert.equal(recorder.insertedTaskRuns[0]?.sessionId, "session-1");
  assert.equal(recorder.insertedTaskRuns[0]?.createdByAgentId, "agent-1");
});

test("TaskService.startTask self-assigns unassigned draft tasks before creating the run", async () => {
  const taskService = new TaskService();
  const recorder = new StartTaskTransactionRecorder({
    initialTaskRow: {
      assignedAgentId: null,
      assignedAt: null,
      assignedUserId: null,
      completedAt: null,
      createdAt: new Date("2026-04-20T12:00:00.000Z"),
      description: null,
      id: "task-1",
      name: "Ship the change",
      status: "draft",
      taskStageId: "stage-1",
      updatedAt: new Date("2026-04-20T12:00:00.000Z"),
    },
    updatedTaskRow: {
      assignedAgentId: "agent-1",
      assignedAt: new Date("2026-04-20T12:30:00.000Z"),
      assignedUserId: null,
      completedAt: null,
      createdAt: new Date("2026-04-20T12:00:00.000Z"),
      description: null,
      id: "task-1",
      name: "Ship the change",
      status: "in_progress",
      taskStageId: "stage-1",
      updatedAt: new Date("2026-04-20T12:30:00.000Z"),
    },
  });

  const result = await taskService.startTask(recorder.buildTransactionProvider() as never, {
    actorAgentId: "agent-1",
    companyId: "company-1",
    sessionId: "session-1",
    taskId: "task-1",
  });

  assert.equal(result.task.assignee?.id, "agent-1");
  assert.equal(result.task.status, "in_progress");
  assert.equal(result.taskRun.id, "task-run-1");
  assert.equal(recorder.updatedTasks[0]?.assignedAgentId, "agent-1");
  assert.equal(recorder.updatedTasks[0]?.status, "in_progress");
  assert.equal(recorder.insertedTaskRuns[0]?.sessionId, "session-1");
});
