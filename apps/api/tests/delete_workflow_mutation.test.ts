import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { DeleteWorkflowMutation } from "../src/graphql/mutations/delete_workflow.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";

/**
 * Builds authenticated request context and workflow records for exercising the delete mutation
 * without a database. The mocked service still returns trigger metadata so scheduler cleanup is
 * covered alongside GraphQL serialization.
 */
class DeleteWorkflowMutationTestHarness {
  static createContext(): GraphqlRequestContext {
    return {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-1",
          name: "Company",
        },
        token: "token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-1",
          lastName: null,
          provider: "local",
          providerSubject: "subject-1",
        },
      },
    };
  }

  static createWorkflowRecord() {
    const createdAt = new Date("2026-04-17T16:00:00.000Z");
    const updatedAt = new Date("2026-04-17T16:05:00.000Z");

    return {
      createdAt,
      description: "Coordinates onboarding",
      id: "workflow-1",
      inputs: [{
        createdAt,
        defaultValue: null,
        description: "Repository name",
        id: "input-1",
        isRequired: true,
        name: "repository",
        workflowDefinitionId: "workflow-1",
      }],
      instructions: "Prepare the company workspace.",
      isEnabled: true,
      name: "Onboarding",
      steps: [{
        createdAt,
        id: "step-row-1",
        instructions: "Create the repository.",
        name: "Create repository",
        ordinal: 1,
        stepId: "create-repository",
        workflowDefinitionId: "workflow-1",
      }],
      triggers: [{
        agentId: "agent-1",
        agentName: "Operator",
        createdAt,
        cronPattern: "0 9 * * 1-5",
        enabled: true,
        id: "trigger-1",
        inputValues: [{
          id: "trigger-input-1",
          name: "repository",
          value: "companyhelm",
        }],
        overlapPolicy: "skip" as const,
        timezone: "America/Los_Angeles",
        type: "cron" as const,
        updatedAt,
        workflowDefinitionId: "workflow-1",
      }],
      updatedAt,
    };
  }
}

test("DeleteWorkflowMutation deletes the authenticated company workflow and removes its schedulers", async () => {
  const workflow = DeleteWorkflowMutationTestHarness.createWorkflowRecord();
  const deleteWorkflow = vi.fn(async () => workflow);
  const removeCronTrigger = vi.fn(async () => undefined);
  const mutation = new DeleteWorkflowMutation({
    deleteWorkflow,
  } as never, {
    removeCronTrigger,
  } as never);

  const result = await mutation.execute(null, {
    input: {
      id: "workflow-1",
    },
  }, DeleteWorkflowMutationTestHarness.createContext());

  assert.deepEqual(deleteWorkflow.mock.calls[0], [{}, "company-1", "workflow-1"]);
  assert.deepEqual(removeCronTrigger.mock.calls[0], ["trigger-1"]);
  assert.deepEqual(result, {
    createdAt: "2026-04-17T16:00:00.000Z",
    description: "Coordinates onboarding",
    id: "workflow-1",
    inputs: [{
      createdAt: "2026-04-17T16:00:00.000Z",
      defaultValue: null,
      description: "Repository name",
      id: "input-1",
      isRequired: true,
      name: "repository",
    }],
    instructions: "Prepare the company workspace.",
    isEnabled: true,
    name: "Onboarding",
    steps: [{
      createdAt: "2026-04-17T16:00:00.000Z",
      id: "step-row-1",
      instructions: "Create the repository.",
      name: "Create repository",
      ordinal: 1,
      stepId: "create-repository",
    }],
    triggers: [{
      agentId: "agent-1",
      agentName: "Operator",
      createdAt: "2026-04-17T16:00:00.000Z",
      cronPattern: "0 9 * * 1-5",
      enabled: true,
      id: "trigger-1",
      inputValues: [{
        id: "trigger-input-1",
        name: "repository",
        value: "companyhelm",
      }],
      overlapPolicy: "skip",
      timezone: "America/Los_Angeles",
      type: "cron",
      updatedAt: "2026-04-17T16:05:00.000Z",
      workflowDefinitionId: "workflow-1",
    }],
    updatedAt: "2026-04-17T16:05:00.000Z",
  });
});

test("DeleteWorkflowMutation requires authenticated company context", async () => {
  const mutation = new DeleteWorkflowMutation({
    async deleteWorkflow() {
      throw new Error("should not delete");
    },
  } as never, {
    async removeCronTrigger() {
      throw new Error("should not remove scheduler");
    },
  } as never);

  await assert.rejects(
    mutation.execute(null, {
      input: {
        id: "workflow-1",
      },
    }, {
      app_runtime_transaction_provider: null,
      authSession: null,
    }),
    /Authentication required/,
  );
});
