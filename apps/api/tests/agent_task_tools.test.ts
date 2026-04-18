import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentCreateTaskTool } from "../src/services/agent/session/pi-mono/tools/tasks/create_task.ts";
import { AgentListAssignedTasksTool } from "../src/services/agent/session/pi-mono/tools/tasks/list_assigned_tasks.ts";
import { AgentListTasksTool } from "../src/services/agent/session/pi-mono/tools/tasks/list_tasks.ts";
import { AgentTaskToolProvider } from "../src/services/agent/session/pi-mono/tools/tasks/provider.ts";
import { AgentUpdateTaskStatusTool } from "../src/services/agent/session/pi-mono/tools/tasks/update_task_status.ts";

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

test("AgentTaskToolProvider contributes the task management tools", () => {
  const provider = new AgentTaskToolProvider({
    async createTask() {
      throw new Error("task creation is lazy");
    },
    async listAssignedTasks() {
      throw new Error("assigned task listing is lazy");
    },
    async listTasks() {
      throw new Error("task listing is lazy");
    },
    async updateTaskStatus() {
      throw new Error("task status updates are lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["list_tasks", "list_assigned_tasks", "create_task", "update_task_status"],
  );
});

test("AgentListTasksTool renders paginated task summaries", async () => {
  const tool = new AgentListTasksTool({
    async listTasks() {
      return {
        nextOffset: 1,
        tasks: [{
          assignedAt: null,
          assignee: {
            email: null,
            id: "agent-1",
            kind: "agent",
            name: "CEO",
          },
          createdAt: new Date("2026-03-31T20:00:00.000Z"),
          description: "Capture the first draft.",
          id: "task-1",
          name: "Write launch post",
          status: "in_progress",
          taskStageId: "stage-backlog",
          taskStageName: "Backlog",
          updatedAt: new Date("2026-03-31T20:00:00.000Z"),
        }],
        totalCount: 2,
      };
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute(
    "tool-call-1",
    {},
    undefined,
    undefined,
    undefined,
  );

  assert.equal(result.details?.nextOffset, 1);
  assert.equal(result.details?.totalCount, 2);
  assert.match(result.content[0]?.text ?? "", /name: Write launch post/);
  assert.match(result.content[0]?.text ?? "", /assignee: agent:CEO/);
});

test("AgentListAssignedTasksTool scopes task listing to the running agent", async () => {
  const tool = new AgentListAssignedTasksTool({
    async listAssignedTasks() {
      return {
        nextOffset: null,
        tasks: [],
        totalCount: 0,
      };
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute(
    "tool-call-1",
    {},
    undefined,
    undefined,
    undefined,
  );

  assert.equal(result.content[0]?.text, [
    "totalCount: 0",
    "nextOffset: none",
    "tasks: none",
  ].join("\n"));
});

test("AgentCreateTaskTool returns the created task summary", async () => {
  const tool = new AgentCreateTaskTool({
    async createTask() {
      return {
        assignedAt: null,
        assignee: null,
        createdAt: new Date("2026-03-31T20:00:00.000Z"),
        description: null,
        id: "task-2",
        name: "Review rollout copy",
        status: "draft",
        taskStageId: "stage-backlog",
        taskStageName: "Backlog",
        updatedAt: new Date("2026-03-31T20:00:00.000Z"),
      };
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute(
    "tool-call-1",
    {
      name: "Review rollout copy",
    },
    undefined,
    undefined,
    undefined,
  );

  assert.equal(result.details?.taskId, "task-2");
  assert.match(result.content[0]?.text ?? "", /status: draft/);
});

test("AgentUpdateTaskStatusTool returns the updated task summary", async () => {
  const tool = new AgentUpdateTaskStatusTool({
    async updateTaskStatus() {
      return {
        assignedAt: null,
        assignee: null,
        createdAt: new Date("2026-03-31T20:00:00.000Z"),
        description: null,
        id: "task-3",
        name: "Ship changelog",
        status: "completed",
        taskStageId: "stage-backlog",
        taskStageName: "Backlog",
        updatedAt: new Date("2026-03-31T21:00:00.000Z"),
      };
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute(
    "tool-call-1",
    {
      status: "completed",
      taskId: "task-3",
    },
    undefined,
    undefined,
    undefined,
  );

  assert.equal(result.details?.taskId, "task-3");
  assert.match(result.content[0]?.text ?? "", /status: completed/);
});
