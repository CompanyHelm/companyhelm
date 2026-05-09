import assert from "node:assert/strict";
import { test } from "vitest";
import { TaskManagementSystemCommandService } from "../src/services/system_commands/task_management.ts";

const context = {
  agentId: "agent-1",
  companyId: "company-123",
  sessionId: "session-1",
  transactionProvider: "transaction-provider",
} as never;

test("TaskManagementSystemCommandService lists company tasks with filters", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new TaskManagementSystemCommandService({
    async listTasks(_transactionProvider: unknown, input: Record<string, unknown>) {
      capturedInput = input;
      return {
        nextOffset: null,
        tasks: [{
          assignedAt: null,
          assignee: null,
          completedAt: null,
          createdAt: new Date("2026-04-20T12:00:00.000Z"),
          description: "Follow up",
          id: "task-1",
          name: "Follow-up task",
          status: "in_progress",
          taskStageId: "stage-1",
          taskStageName: "Backlog",
          updatedAt: new Date("2026-04-20T12:30:00.000Z"),
        }],
        totalCount: 1,
      };
    },
  } as never);

  const result = await service.execute("task.list", {
    assignedAgentId: "agent-2",
    limit: 10,
    offset: 5,
    status: "in_progress",
  }, context);

  assert.deepEqual(capturedInput, {
    assignedAgentId: "agent-2",
    companyId: "company-123",
    limit: 10,
    offset: 5,
    status: "in_progress",
  });
  assert.deepEqual(result.tasks, [{
    assignedAt: null,
    assignee: null,
    completedAt: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: "Follow up",
    id: "task-1",
    name: "Follow-up task",
    status: "in_progress",
    taskStageId: "stage-1",
    taskStageName: "Backlog",
    updatedAt: "2026-04-20T12:30:00.000Z",
  }]);
});

test("TaskManagementSystemCommandService lists task runs with session and unfinished filters", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new TaskManagementSystemCommandService({
    async listTaskRuns(_transactionProvider: unknown, input: Record<string, unknown>) {
      capturedInput = input;
      return {
        nextOffset: null,
        taskRuns: [{
          agentId: "agent-2",
          agentName: "Software Engineer",
          createdAt: new Date("2026-04-20T12:00:00.000Z"),
          endedReason: null,
          finishedAt: null,
          id: "task-run-1",
          lastActivityAt: new Date("2026-04-20T12:30:00.000Z"),
          sessionId: "session-2",
          startedAt: new Date("2026-04-20T12:01:00.000Z"),
          status: "running",
          taskId: "task-1",
          taskName: "Build onboarding flow",
          taskStatus: "in_progress",
          updatedAt: new Date("2026-04-20T12:30:00.000Z"),
        }],
        totalCount: 1,
      };
    },
  } as never);

  const result = await service.execute("task_run.list", {
    assignedAgentId: "agent-2",
    finished: false,
    limit: 10,
    offset: 0,
    sessionId: "session-2",
    status: "running",
    taskId: "task-1",
  }, context);

  assert.deepEqual(capturedInput, {
    assignedAgentId: "agent-2",
    companyId: "company-123",
    finished: false,
    limit: 10,
    offset: 0,
    sessionId: "session-2",
    status: "running",
    taskId: "task-1",
  });
  assert.deepEqual(result.taskRuns, [{
    agentId: "agent-2",
    agentName: "Software Engineer",
    createdAt: "2026-04-20T12:00:00.000Z",
    endedReason: null,
    finishedAt: null,
    id: "task-run-1",
    lastActivityAt: "2026-04-20T12:30:00.000Z",
    sessionId: "session-2",
    startedAt: "2026-04-20T12:01:00.000Z",
    status: "running",
    taskId: "task-1",
    taskName: "Build onboarding flow",
    taskStatus: "in_progress",
    updatedAt: "2026-04-20T12:30:00.000Z",
  }]);
});

test("TaskManagementSystemCommandService forwards partial task updates with session identity", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new TaskManagementSystemCommandService({
    async updateTask(_transactionProvider: unknown, input: Record<string, unknown>) {
      capturedInput = input;
      return {
        assignedAt: null,
        assignee: null,
        completedAt: new Date("2026-04-20T13:00:00.000Z"),
        createdAt: new Date("2026-04-20T12:00:00.000Z"),
        description: null,
        id: "task-1",
        name: "Updated task",
        status: "completed",
        taskStageId: "stage-done",
        taskStageName: "Done",
        updatedAt: new Date("2026-04-20T13:00:00.000Z"),
      };
    },
  } as never);

  const result = await service.execute("task.update", {
    assignedAgentId: null,
    description: null,
    name: "Updated task",
    status: "completed",
    taskId: "task-1",
    taskStageId: "stage-done",
  }, context);

  assert.deepEqual(capturedInput, {
    assignedAgentId: null,
    assignedUserId: undefined,
    actorAgentId: "agent-1",
    companyId: "company-123",
    description: null,
    name: "Updated task",
    sessionId: "session-1",
    status: "completed",
    taskStageId: "stage-done",
    taskId: "task-1",
  });
  assert.deepEqual(result.task, {
    assignedAt: null,
    assignee: null,
    completedAt: "2026-04-20T13:00:00.000Z",
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id: "task-1",
    name: "Updated task",
    status: "completed",
    taskStageId: "stage-done",
    taskStageName: "Done",
    updatedAt: "2026-04-20T13:00:00.000Z",
  });
});

test("TaskManagementSystemCommandService creates and deletes tasks through the shared service", async () => {
  const calls: string[] = [];
  const service = new TaskManagementSystemCommandService({
    async createTask(_transactionProvider: unknown, input: Record<string, unknown>) {
      calls.push("create");
      assert.deepEqual(input, {
        assignedAgentId: "agent-2",
        assignedUserId: undefined,
        companyId: "company-123",
        createdByAgentId: "agent-1",
        description: "Draft it",
        name: "Draft launch note",
        status: "draft",
        taskStageId: undefined,
      });
      return {
        assignedAt: null,
        assignee: null,
        completedAt: null,
        createdAt: new Date("2026-04-20T12:00:00.000Z"),
        description: "Draft it",
        id: "task-2",
        name: "Draft launch note",
        status: "draft",
        taskStageId: "stage-1",
        taskStageName: "Backlog",
        updatedAt: new Date("2026-04-20T12:00:00.000Z"),
      };
    },
    async deleteTask(_transactionProvider: unknown, input: Record<string, unknown>) {
      calls.push("delete");
      assert.deepEqual(input, {
        companyId: "company-123",
        taskId: "task-2",
      });
      return {
        assignedAt: null,
        assignee: null,
        completedAt: null,
        createdAt: new Date("2026-04-20T12:00:00.000Z"),
        description: "Draft it",
        id: "task-2",
        name: "Draft launch note",
        status: "draft",
        taskStageId: "stage-1",
        taskStageName: "Backlog",
        updatedAt: new Date("2026-04-20T12:00:00.000Z"),
      };
    },
  } as never);

  const created = await service.execute("task.create", {
    assignedAgentId: "agent-2",
    description: "Draft it",
    name: "Draft launch note",
    status: "draft",
  }, context);
  const deleted = await service.execute("task.delete", {
    taskId: "task-2",
  }, context);

  assert.equal((created.task as Record<string, unknown>).id, "task-2");
  assert.equal((deleted.task as Record<string, unknown>).id, "task-2");
  assert.deepEqual(calls, ["create", "delete"]);
});
