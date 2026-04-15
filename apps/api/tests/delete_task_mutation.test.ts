import assert from "node:assert/strict";
import { test } from "vitest";
import { DeleteTaskMutation } from "../src/graphql/mutations/delete_task.ts";

test("DeleteTaskMutation returns the deleted task snapshot", async () => {
  const mutation = new DeleteTaskMutation({
    async deleteTask() {
      return {
        assignedAt: null,
        assignee: null,
        createdAt: new Date("2026-04-03T18:00:00.000Z"),
        description: "Remove the obsolete workflow task.",
        id: "task-1",
        name: "Delete task",
        status: "draft",
        taskStageId: null,
        taskStageName: null,
        updatedAt: new Date("2026-04-03T18:00:00.000Z"),
      };
    },
  } as never);

  const result = await mutation.execute(
    null,
    {
      input: {
        taskId: "task-1",
      },
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

  assert.deepEqual(result, {
    assignedAt: null,
    assignee: null,
    createdAt: "2026-04-03T18:00:00.000Z",
    description: "Remove the obsolete workflow task.",
    id: "task-1",
    name: "Delete task",
    status: "draft",
    taskStageId: null,
    taskStageName: null,
    updatedAt: "2026-04-03T18:00:00.000Z",
  });
});
