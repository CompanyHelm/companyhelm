import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { WorkflowExecutionSessionService } from "../src/services/workflows/execution_session_service.ts";

test("WorkflowExecutionSessionService only exposes enabled workflows", async () => {
  const transactionProvider = {
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      return callback({});
    },
  };
  const workflowService = {
    listWorkflows: vi.fn(async () => {
      return [{
        createdAt: new Date("2026-04-19T06:00:00.000Z"),
        description: "Hidden workflow",
        id: "workflow-disabled",
        inputs: [],
        instructions: null,
        isEnabled: false,
        name: "Disabled workflow",
        steps: [],
        triggers: [],
        updatedAt: new Date("2026-04-19T06:00:00.000Z"),
      }, {
        createdAt: new Date("2026-04-19T06:01:00.000Z"),
        description: "Runnable workflow",
        id: "workflow-enabled",
        inputs: [{
          createdAt: new Date("2026-04-19T06:01:00.000Z"),
          defaultValue: null,
          description: "Target repository",
          id: "input-1",
          isRequired: true,
          name: "repo",
          workflowDefinitionId: "workflow-enabled",
        }],
        instructions: null,
        isEnabled: true,
        name: "Enabled workflow",
        steps: [],
        triggers: [],
        updatedAt: new Date("2026-04-19T06:01:00.000Z"),
      }];
    }),
  };
  const service = new WorkflowExecutionSessionService(
    transactionProvider as never,
    "company-1",
    "agent-1",
    "session-1",
    workflowService as never,
  );

  const workflows = await service.listWorkflows();

  assert.deepEqual(workflowService.listWorkflows.mock.calls, [[transactionProvider, "company-1"]]);
  assert.deepEqual(workflows, [{
    description: "Runnable workflow",
    id: "workflow-enabled",
    inputs: [{
      defaultValue: null,
      description: "Target repository",
      isRequired: true,
      name: "repo",
    }],
    name: "Enabled workflow",
  }]);
});

test("WorkflowExecutionSessionService normalizes local kickoff inputs and records workflow lineage", async () => {
  const transactionProvider = {
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      return callback({
        select() {
          return {
            from() {
              return {
                async where() {
                  return [{
                    id: "workflow-run-parent",
                  }];
                },
              };
            },
          };
        },
      });
    },
  };
  const startLocalWorkflowRun = vi.fn(async () => {
    return {
      executionInstructions: "Execute the following workflow run.\n\nWorkflow run steps:\n1. Build",
      workflowRun: {
        agentId: "agent-1",
        completedAt: null,
        createdAt: new Date("2026-04-19T06:10:00.000Z"),
        id: "workflow-run-2",
        instructions: "Execute the workflow",
        sessionId: "session-1",
        source: "manual",
        startedAt: new Date("2026-04-19T06:10:00.000Z"),
        status: "running",
        steps: [],
        triggerId: null,
        updatedAt: new Date("2026-04-19T06:10:00.000Z"),
        workflowDefinitionId: "workflow-2",
      },
    };
  });
  const service = new WorkflowExecutionSessionService(
    transactionProvider as never,
    "company-1",
    "agent-1",
    "session-1",
    {
      startLocalWorkflowRun,
    } as never,
  );

  const result = await service.startWorkflow({
    input: {
      attempts: 2,
      branch: "main",
      dryRun: true,
      metadata: {
        repo: "CompanyHelm/companyhelm",
      },
      notes: null,
    },
    workflowDefinitionId: "workflow-2",
  });

  assert.deepEqual(startLocalWorkflowRun.mock.calls, [[transactionProvider, {
    agentId: "agent-1",
    companyId: "company-1",
    inputValues: [{
      name: "attempts",
      value: "2",
    }, {
      name: "branch",
      value: "main",
    }, {
      name: "dryRun",
      value: "true",
    }, {
      name: "metadata",
      value: JSON.stringify({
        repo: "CompanyHelm/companyhelm",
      }),
    }, {
      name: "notes",
      value: "",
    }],
    parentWorkflowRunId: "workflow-run-parent",
    sessionId: "session-1",
    startedByAgentId: "agent-1",
    startedBySessionId: "session-1",
    workflowDefinitionId: "workflow-2",
  }]]);
  assert.match(result.executionInstructions ?? "", /Execute the following workflow run/);
  assert.equal(result.parentWorkflowRunId, "workflow-run-parent");
  assert.equal(result.workflowRun.id, "workflow-run-2");
});

test("WorkflowExecutionSessionService starts delegated workflow runs with the requested agent", async () => {
  const transactionProvider = {
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      return callback({
        select() {
          return {
            from() {
              return {
                async where() {
                  return [];
                },
              };
            },
          };
        },
      });
    },
  };
  const startWorkflowRun = vi.fn(async () => {
    return {
      agentId: "agent-2",
      completedAt: null,
      createdAt: new Date("2026-04-19T06:10:00.000Z"),
      id: "workflow-run-3",
      instructions: "Execute the delegated workflow",
      sessionId: "session-3",
      source: "manual",
      startedAt: new Date("2026-04-19T06:10:00.000Z"),
      status: "running",
      steps: [],
      triggerId: null,
      updatedAt: new Date("2026-04-19T06:10:00.000Z"),
      workflowDefinitionId: "workflow-3",
    };
  });
  const service = new WorkflowExecutionSessionService(
    transactionProvider as never,
    "company-1",
    "agent-1",
    "session-1",
    {
      startWorkflowRun,
    } as never,
  );

  const result = await service.startWorkflow({
    agentId: "agent-2",
    executionMode: "agent",
    input: {
      branch: "main",
    },
    workflowDefinitionId: "workflow-3",
  });

  assert.deepEqual(startWorkflowRun.mock.calls, [[transactionProvider, {
    agentId: "agent-2",
    companyId: "company-1",
    inputValues: [{
      name: "branch",
      value: "main",
    }],
    parentWorkflowRunId: null,
    startedByAgentId: "agent-1",
    startedBySessionId: "session-1",
    workflowDefinitionId: "workflow-3",
  }]]);
  assert.equal(result.executionInstructions, null);
  assert.equal(result.workflowRun.agentId, "agent-2");
});
