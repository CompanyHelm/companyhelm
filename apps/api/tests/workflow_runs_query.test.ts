import assert from "node:assert/strict";
import { test } from "vitest";
import { WorkflowRunsQueryResolver } from "../src/graphql/resolvers/workflow_runs.ts";

test("WorkflowRunsQueryResolver serializes workflow run history for one workflow", async () => {
  const transactionProvider = {} as never;
  const resolver = new WorkflowRunsQueryResolver({
    async listWorkflowRuns(receivedTransactionProvider: unknown, companyId: string, workflowDefinitionId: string) {
      assert.equal(receivedTransactionProvider, transactionProvider);
      assert.equal(companyId, "company-123");
      assert.equal(workflowDefinitionId, "workflow-1");

      return [{
        agentId: "agent-1",
        completedAt: null,
        createdAt: new Date("2026-04-03T18:00:00.000Z"),
        id: "workflow-run-1",
        instructions: "Run the workflow",
        sessionId: "session-1",
        startedAt: new Date("2026-04-03T18:00:30.000Z"),
        status: "running",
        steps: [{
          id: "step-run-1",
          instructions: "Do the first step",
          name: "First step",
          ordinal: 1,
          status: "running",
          workflowRunId: "workflow-run-1",
        }],
        updatedAt: new Date("2026-04-03T18:05:00.000Z"),
        workflowDefinitionId: "workflow-1",
      }];
    },
  } as never);

  const result = await resolver.execute(
    null,
    {
      workflowDefinitionId: "workflow-1",
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
      app_runtime_transaction_provider: transactionProvider,
    },
  );

  assert.deepEqual(result, [{
    agentId: "agent-1",
    completedAt: null,
    createdAt: "2026-04-03T18:00:00.000Z",
    id: "workflow-run-1",
    instructions: "Run the workflow",
    sessionId: "session-1",
    startedAt: "2026-04-03T18:00:30.000Z",
    status: "running",
    steps: [{
      id: "step-run-1",
      instructions: "Do the first step",
      name: "First step",
      ordinal: 1,
      status: "running",
      workflowRunId: "workflow-run-1",
    }],
    updatedAt: "2026-04-03T18:05:00.000Z",
    workflowDefinitionId: "workflow-1",
  }]);
});
