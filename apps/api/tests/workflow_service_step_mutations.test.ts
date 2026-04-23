import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { workflowDefinitions, workflowStepDefinitions } from "../src/db/schema.ts";
import { WorkflowService } from "../src/services/workflows/service.ts";

type WorkflowServiceTestDouble = WorkflowService & {
  hydrateWorkflowRows: ReturnType<typeof vi.fn>;
  requireWorkflowDefinitionRow: ReturnType<typeof vi.fn>;
  requireWorkflowDefinitionSteps: ReturnType<typeof vi.fn>;
};

/**
 * These tests exercise the real targeted step-mutation service methods so we can verify they do
 * not fall back to the older full-step replacement path that regenerated ids for untouched steps.
 */
test("WorkflowService updates one step without deleting or reinserting untouched step rows", async () => {
  const operations: Array<{ kind: string; table: unknown; values: Record<string, unknown> }> = [];
  const service = new WorkflowService({} as never) as unknown as WorkflowServiceTestDouble;
  const workflowRow = {
    createdAt: new Date("2026-04-20T12:00:00.000Z"),
    description: "Coordinate release work.",
    id: "workflow-1",
    instructions: "Keep release state current.",
    isEnabled: true,
    name: "Release workflow",
    updatedAt: new Date("2026-04-20T12:00:00.000Z"),
  };
  const hydratedWorkflow = {
    ...workflowRow,
    inputs: [],
    steps: [{
      createdAt: new Date("2026-04-20T12:00:00.000Z"),
      id: "step-row-1",
      instructions: "New instructions",
      name: "Updated step",
      ordinal: 1,
      stepId: "step-1",
      workflowDefinitionId: "workflow-1",
    }, {
      createdAt: new Date("2026-04-20T12:05:00.000Z"),
      id: "step-row-2",
      instructions: "Keep this",
      name: "Second step",
      ordinal: 2,
      stepId: "step-2",
      workflowDefinitionId: "workflow-1",
    }],
    triggers: [],
  };

  service.requireWorkflowDefinitionRow = vi.fn().mockResolvedValue(workflowRow);
  service.requireWorkflowDefinitionSteps = vi.fn().mockResolvedValue([{
    createdAt: new Date("2026-04-20T12:00:00.000Z"),
    id: "step-row-1",
    instructions: "Old instructions",
    name: "Old step",
    ordinal: 1,
    stepId: "step-1",
    workflowDefinitionId: "workflow-1",
  }, {
    createdAt: new Date("2026-04-20T12:05:00.000Z"),
    id: "step-row-2",
    instructions: "Keep this",
    name: "Second step",
    ordinal: 2,
    stepId: "step-2",
    workflowDefinitionId: "workflow-1",
  }]);
  service.hydrateWorkflowRows = vi.fn().mockResolvedValue([hydratedWorkflow]);

  const transactionProvider = {
    async transaction<T>(callback: (tx: unknown) => Promise<T>) {
      return callback({
        delete() {
          throw new Error("delete should not be called for updateWorkflowStep");
        },
        insert() {
          throw new Error("insert should not be called for updateWorkflowStep");
        },
        update(table: unknown) {
          return {
            set(values: Record<string, unknown>) {
              return {
                async where() {
                  operations.push({ kind: "update", table, values });
                },
              };
            },
          };
        },
      });
    },
  };

  const result = await service.updateWorkflowStep(transactionProvider as never, {
    companyId: "company-123",
    instructions: "New instructions",
    name: "Updated step",
    stepId: "step-1",
    workflowDefinitionId: "workflow-1",
  });

  assert.equal(result, hydratedWorkflow);
  assert.equal(operations.length, 2);
  assert.deepEqual(operations[0], {
    kind: "update",
    table: workflowStepDefinitions,
    values: {
      instructions_template: "New instructions",
      name: "Updated step",
    },
  });
  assert.equal(operations[1]?.kind, "update");
  assert.equal(operations[1]?.table, workflowDefinitions);
  assert.ok(operations[1]?.values.updatedAt instanceof Date);
});

test("WorkflowService deletes one step, renumbers remaining ordinals, and preserves remaining step ids", async () => {
  const operations: Array<{ kind: string; table: unknown; values?: Record<string, unknown> }> = [];
  const service = new WorkflowService({} as never) as unknown as WorkflowServiceTestDouble;
  const workflowRow = {
    createdAt: new Date("2026-04-20T12:00:00.000Z"),
    description: "Coordinate release work.",
    id: "workflow-1",
    instructions: "Keep release state current.",
    isEnabled: true,
    name: "Release workflow",
    updatedAt: new Date("2026-04-20T12:00:00.000Z"),
  };
  const hydratedWorkflow = {
    ...workflowRow,
    inputs: [],
    steps: [{
      createdAt: new Date("2026-04-20T12:05:00.000Z"),
      id: "step-row-2",
      instructions: "Keep this",
      name: "Second step",
      ordinal: 1,
      stepId: "step-2",
      workflowDefinitionId: "workflow-1",
    }],
    triggers: [],
  };

  service.requireWorkflowDefinitionRow = vi.fn().mockResolvedValue(workflowRow);
  service.requireWorkflowDefinitionSteps = vi.fn().mockResolvedValue([{
    createdAt: new Date("2026-04-20T12:00:00.000Z"),
    id: "step-row-1",
    instructions: "Old instructions",
    name: "Old step",
    ordinal: 1,
    stepId: "step-1",
    workflowDefinitionId: "workflow-1",
  }, {
    createdAt: new Date("2026-04-20T12:05:00.000Z"),
    id: "step-row-2",
    instructions: "Keep this",
    name: "Second step",
    ordinal: 2,
    stepId: "step-2",
    workflowDefinitionId: "workflow-1",
  }]);
  service.hydrateWorkflowRows = vi.fn().mockResolvedValue([hydratedWorkflow]);

  const transactionProvider = {
    async transaction<T>(callback: (tx: unknown) => Promise<T>) {
      return callback({
        delete(table: unknown) {
          return {
            async where() {
              operations.push({ kind: "delete", table });
            },
          };
        },
        insert() {
          throw new Error("insert should not be called for deleteWorkflowStep");
        },
        update(table: unknown) {
          return {
            set(values: Record<string, unknown>) {
              return {
                async where() {
                  operations.push({ kind: "update", table, values });
                },
              };
            },
          };
        },
      });
    },
  };

  const result = await service.deleteWorkflowStep(transactionProvider as never, {
    companyId: "company-123",
    stepId: "step-1",
    workflowDefinitionId: "workflow-1",
  });

  assert.equal(result, hydratedWorkflow);
  assert.deepEqual(operations[0], {
    kind: "delete",
    table: workflowStepDefinitions,
  });
  assert.deepEqual(operations[1], {
    kind: "update",
    table: workflowStepDefinitions,
    values: {
      ordinal: 1,
    },
  });
  assert.equal(operations[2]?.kind, "update");
  assert.equal(operations[2]?.table, workflowDefinitions);
  assert.ok(operations[2]?.values?.updatedAt instanceof Date);
});
