import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentListWorkflowsTool } from "../src/services/agent/session/pi-mono/tools/workflows/list_workflows.ts";
import { AgentWorkflowToolProvider } from "../src/services/agent/session/pi-mono/tools/workflows/provider.ts";
import { AgentWorkflowRunToolProvider } from "../src/services/agent/session/pi-mono/tools/workflows/run_provider.ts";
import { AgentWorkflowToolService } from "../src/services/agent/session/pi-mono/tools/workflows/service.ts";
import { AgentStartWorkflowTool } from "../src/services/agent/session/pi-mono/tools/workflows/start_workflow.ts";

type AgentToolExecutionResult = {
  content: Array<{
    text?: string;
  }>;
  details?: Record<string, unknown>;
};

test("AgentWorkflowToolProvider contributes workflow discovery and kickoff tools", () => {
  const provider = new AgentWorkflowToolProvider({
    async listWorkflows() {
      throw new Error("workflow listing is lazy");
    },
    async startWorkflow() {
      throw new Error("workflow kickoff is lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["list_workflows", "start_workflow"],
  );
});

test("AgentWorkflowRunToolProvider contributes the in-run workflow status tool", () => {
  const provider = new AgentWorkflowRunToolProvider({
    async updateStepStatus() {
      throw new Error("workflow step updates are lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["update_workflow_run_step_status"],
  );
});

test("AgentListWorkflowsTool renders enabled workflows and their inputs", async () => {
  const tool = new AgentListWorkflowsTool({
    async listWorkflows() {
      return [{
        description: "Launches the feature workflow.",
        id: "workflow-1",
        inputs: [{
          defaultValue: "main",
          description: "Repository branch to work against.",
          isRequired: true,
          name: "branch",
        }],
        name: "Implement Feature",
      }];
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

  assert.deepEqual(result.details, {
    type: "workflow_catalog",
    workflowCount: 1,
    workflowIds: ["workflow-1"],
  });
  assert.match(result.content[0]?.text ?? "", /name: Implement Feature/);
  assert.match(result.content[0]?.text ?? "", /input: branch/);
  assert.match(result.content[0]?.text ?? "", /defaultValue: main/);
});

test("AgentStartWorkflowTool returns the created workflow run metadata", async () => {
  const tool = new AgentStartWorkflowTool({
    async startWorkflow() {
      return {
        parentWorkflowRunId: "workflow-run-parent",
        workflowRun: {
          agentId: "agent-1",
          completedAt: null,
          createdAt: new Date("2026-04-19T06:15:00.000Z"),
          id: "workflow-run-1",
          instructions: "Execute the run",
          sessionId: "session-2",
          startedAt: new Date("2026-04-19T06:15:00.000Z"),
          status: "running",
          steps: [],
          updatedAt: new Date("2026-04-19T06:15:00.000Z"),
          workflowDefinitionId: "workflow-1",
        },
      };
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute(
    "tool-call-1",
    {
      input: {
        branch: "main",
      },
      workflowDefinitionId: "workflow-1",
    },
    undefined,
    undefined,
    undefined,
  );

  assert.deepEqual(result.details, {
    executionSessionId: "session-2",
    parentWorkflowRunId: "workflow-run-parent",
    startedAt: "2026-04-19T06:15:00.000Z",
    status: "running",
    type: "workflow_run",
    workflowDefinitionId: "workflow-1",
    workflowRunId: "workflow-run-1",
  });
  assert.match(result.content[0]?.text ?? "", /workflowRunId: workflow-run-1/);
  assert.match(result.content[0]?.text ?? "", /executionSessionId: session-2/);
  assert.match(result.content[0]?.text ?? "", /parentWorkflowRunId: workflow-run-parent/);
});

test("AgentWorkflowToolService only exposes enabled workflows", async () => {
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
        updatedAt: new Date("2026-04-19T06:01:00.000Z"),
      }];
    }),
  };
  const service = new AgentWorkflowToolService(
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

test("AgentWorkflowToolService normalizes kickoff inputs and records workflow lineage", async () => {
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
  const startWorkflowRun = vi.fn(async () => {
    return {
      agentId: "agent-1",
      completedAt: null,
      createdAt: new Date("2026-04-19T06:10:00.000Z"),
      id: "workflow-run-2",
      instructions: "Execute the workflow",
      sessionId: "session-2",
      startedAt: new Date("2026-04-19T06:10:00.000Z"),
      status: "running",
      steps: [],
      updatedAt: new Date("2026-04-19T06:10:00.000Z"),
      workflowDefinitionId: "workflow-2",
    };
  });
  const service = new AgentWorkflowToolService(
    transactionProvider as never,
    "company-1",
    "agent-1",
    "session-1",
    {
      startWorkflowRun,
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

  assert.deepEqual(startWorkflowRun.mock.calls, [[transactionProvider, {
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
    startedByAgentId: "agent-1",
    startedBySessionId: "session-1",
    workflowDefinitionId: "workflow-2",
  }]]);
  assert.equal(result.parentWorkflowRunId, "workflow-run-parent");
  assert.equal(result.workflowRun.id, "workflow-run-2");
});
