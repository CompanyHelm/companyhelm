import assert from "node:assert/strict";
import { test } from "vitest";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import { AgentListAssignedTasksTool } from "../src/services/agent/session/pi-mono/tools/assigned_tasks/list_assigned_tasks.ts";
import { AgentAssignedTaskToolProvider } from "../src/services/agent/session/pi-mono/tools/assigned_tasks/provider.ts";
import { AgentAssignedTaskToolService } from "../src/services/agent/session/pi-mono/tools/assigned_tasks/service.ts";
import { AgentUpdateAssignedTaskStatusTool } from "../src/services/agent/session/pi-mono/tools/assigned_tasks/update_assigned_task_status.ts";
import type {
  TaskServiceGetTaskInput,
  TaskServiceListTasksInput,
  TaskServiceUpdateTaskStatusInput,
} from "../src/services/task_service.ts";

type AgentToolExecutionResult = {
  content: Array<{
    text?: string;
  }>;
  details?: {
    nextOffset?: number | null;
    taskId?: string;
    totalCount?: number;
  };
};

test("AgentAssignedTaskToolProvider contributes only assigned task handling tools", () => {
  const provider = new AgentAssignedTaskToolProvider({
    async listAssignedTasks() {
      throw new Error("assigned task listing is lazy");
    },
    async updateAssignedTaskStatus() {
      throw new Error("assigned task status updates are lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["list_assigned_tasks", "update_assigned_task_status"],
  );
});

test("AgentListAssignedTasksTool renders the current agent task queue", async () => {
  const tool = new AgentListAssignedTasksTool({
    async listAssignedTasks() {
      return {
        nextOffset: 1,
        tasks: [{
          assignedAt: null,
          assignee: {
            email: null,
            id: "agent-1",
            kind: "agent",
            name: "Engineer",
          },
          completedAt: null,
          createdAt: new Date("2026-04-20T12:00:00.000Z"),
          description: "Capture the first draft.",
          id: "task-1",
          name: "Write launch post",
          status: "in_progress",
          taskStageId: "stage-backlog",
          taskStageName: "Backlog",
          updatedAt: new Date("2026-04-20T12:30:00.000Z"),
        }],
        totalCount: 2,
      };
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute("tool-call-1", {}, undefined, undefined, undefined);

  assert.equal(result.details?.nextOffset, 1);
  assert.equal(result.details?.totalCount, 2);
  assert.match(result.content[0]?.text ?? "", /name: Write launch post/);
  assert.match(result.content[0]?.text ?? "", /stage: Backlog/);
});

test("AgentUpdateAssignedTaskStatusTool returns the updated assigned task", async () => {
  const tool = new AgentUpdateAssignedTaskStatusTool({
    async updateAssignedTaskStatus() {
      return {
        assignedAt: null,
        assignee: {
          email: null,
          id: "agent-1",
          kind: "agent",
          name: "Engineer",
        },
        completedAt: new Date("2026-04-20T13:00:00.000Z"),
        createdAt: new Date("2026-04-20T12:00:00.000Z"),
        description: null,
        id: "task-1",
        name: "Ship changelog",
        status: "completed",
        taskStageId: "stage-backlog",
        taskStageName: "Backlog",
        updatedAt: new Date("2026-04-20T13:00:00.000Z"),
      };
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute("tool-call-1", {
    status: "completed",
    taskId: "task-1",
  }, undefined, undefined, undefined);

  assert.equal(result.details?.taskId, "task-1");
  assert.match(result.content[0]?.text ?? "", /status: completed/);
});

test("AgentAssignedTaskToolService forwards assigned listing with current agent scope", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new AgentAssignedTaskToolService(
    {} as never,
    "company-1",
    "agent-1",
    "session-1",
    {
      async listTasks(
        _transactionProvider: TransactionProviderInterface,
        input: TaskServiceListTasksInput,
      ) {
        capturedInput = input as Record<string, unknown>;
        return {
          nextOffset: null,
          tasks: [],
          totalCount: 0,
        };
      },
    } as never,
  );

  await service.listAssignedTasks({
    limit: 10,
    offset: 5,
    status: "draft",
  });

  assert.deepEqual(capturedInput, {
    assignedAgentId: "agent-1",
    companyId: "company-1",
    limit: 10,
    offset: 5,
    status: "draft",
  });
});

test("AgentAssignedTaskToolService updates status only for tasks assigned to current agent", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new AgentAssignedTaskToolService(
    {} as never,
    "company-1",
    "agent-1",
    "session-1",
    {
      async getTask(
        _transactionProvider: TransactionProviderInterface,
        input: TaskServiceGetTaskInput,
      ) {
        assert.deepEqual(input, {
          companyId: "company-1",
          taskId: "task-1",
        });
        return {
          assignedAt: null,
          assignee: {
            email: null,
            id: "agent-1",
            kind: "agent",
            name: "Engineer",
          },
          completedAt: null,
          createdAt: new Date("2026-04-20T12:00:00.000Z"),
          description: null,
          id: "task-1",
          name: "Ship the change",
          status: "draft",
          taskStageId: "stage-1",
          taskStageName: "Backlog",
          updatedAt: new Date("2026-04-20T12:00:00.000Z"),
        };
      },
      async updateTaskStatus(
        _transactionProvider: TransactionProviderInterface,
        input: TaskServiceUpdateTaskStatusInput,
      ) {
        capturedInput = input as Record<string, unknown>;
        return {
          assignedAt: null,
          assignee: {
            email: null,
            id: "agent-1",
            kind: "agent",
            name: "Engineer",
          },
          completedAt: null,
          createdAt: new Date("2026-04-20T12:00:00.000Z"),
          description: null,
          id: "task-1",
          name: "Ship the change",
          status: "in_progress",
          taskStageId: "stage-1",
          taskStageName: "Backlog",
          updatedAt: new Date("2026-04-20T12:30:00.000Z"),
        };
      },
    } as never,
  );

  await service.updateAssignedTaskStatus({
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

test("AgentAssignedTaskToolService rejects status updates for tasks assigned elsewhere", async () => {
  const service = new AgentAssignedTaskToolService(
    {} as never,
    "company-1",
    "agent-1",
    "session-1",
    {
      async getTask() {
        return {
          assignedAt: null,
          assignee: {
            email: null,
            id: "agent-2",
            kind: "agent",
            name: "Other engineer",
          },
          completedAt: null,
          createdAt: new Date("2026-04-20T12:00:00.000Z"),
          description: null,
          id: "task-1",
          name: "Ship the change",
          status: "draft",
          taskStageId: "stage-1",
          taskStageName: "Backlog",
          updatedAt: new Date("2026-04-20T12:00:00.000Z"),
        };
      },
      async updateTaskStatus() {
        throw new Error("unassigned tasks must not be updated");
      },
    } as never,
  );

  await assert.rejects(
    service.updateAssignedTaskStatus({
      status: "in_progress",
      taskId: "task-1",
    }),
    /Task is not assigned to this agent/,
  );
});
