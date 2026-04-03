import assert from "node:assert/strict";
import { test } from "vitest";
import { TaskRunsQueryResolver } from "../src/graphql/resolvers/task_runs.ts";

test("TaskRunsQueryResolver serializes task-run history for one task", async () => {
  const resolver = new TaskRunsQueryResolver({
    async listTaskRuns() {
      return [{
        agentId: "agent-1",
        agentName: "CEO",
        createdAt: new Date("2026-04-03T18:00:00.000Z"),
        endedReason: null,
        finishedAt: null,
        id: "task-run-1",
        lastActivityAt: new Date("2026-04-03T18:05:00.000Z"),
        sessionId: "session-1",
        startedAt: new Date("2026-04-03T18:00:30.000Z"),
        status: "running",
        taskId: "task-1",
        updatedAt: new Date("2026-04-03T18:05:00.000Z"),
      }];
    },
  } as never);

  const result = await resolver.execute(
    null,
    {
      taskId: "task-1",
    },
    {
      authSession: {
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
        company: {
          id: "company-123",
          name: "Example Org",
        },
      },
      app_runtime_transaction_provider: {} as never,
    },
  );

  assert.deepEqual(result, [{
    agentId: "agent-1",
    agentName: "CEO",
    createdAt: "2026-04-03T18:00:00.000Z",
    endedReason: null,
    finishedAt: null,
    id: "task-run-1",
    lastActivityAt: "2026-04-03T18:05:00.000Z",
    sessionId: "session-1",
    startedAt: "2026-04-03T18:00:30.000Z",
    status: "running",
    taskId: "task-1",
    updatedAt: "2026-04-03T18:05:00.000Z",
  }]);
});
