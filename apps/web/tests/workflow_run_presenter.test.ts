import assert from "node:assert/strict";
import { test } from "node:test";
import { WorkflowRunPresenter } from "../src/pages/chats/workflow_run_presenter";

function buildWorkflowRun(stepStatuses: ReadonlyArray<"done" | "pending" | "running">) {
  return {
    id: "workflow-run-1",
    name: "Release workflow",
    status: stepStatuses.every((status) => status === "done") ? "done" : "running",
    steps: stepStatuses.map((status, index) => ({
      id: `step-${index + 1}`,
      name: `Step ${index + 1}`,
      ordinal: index + 1,
      status,
      workflowRunId: "workflow-run-1",
    })),
    workflowDefinitionId: "workflow-1",
  };
}

test("WorkflowRunPresenter counts a running step as reached in compact progress", () => {
  const workflowRun = buildWorkflowRun(["done", "running", "pending", "pending", "pending"]);

  assert.equal(WorkflowRunPresenter.formatProgress(workflowRun), "2/5");
});

test("WorkflowRunPresenter caps the visible transcript step list at five ordered steps", () => {
  const workflowRun = {
    ...buildWorkflowRun(["done", "done", "running", "pending", "pending", "pending"]),
    steps: [
      ...buildWorkflowRun(["done", "done", "running", "pending", "pending", "pending"]).steps,
    ].reverse(),
  };

  assert.deepEqual(
    WorkflowRunPresenter.getVisibleSteps(workflowRun).map((step) => step.ordinal),
    [1, 2, 3, 4, 5],
  );
});

test("WorkflowRunPresenter uses the running step as the current collapsed step", () => {
  const workflowRun = buildWorkflowRun(["done", "running", "pending"]);

  assert.equal(WorkflowRunPresenter.getCurrentStep(workflowRun)?.name, "Step 2");
});

test("WorkflowRunPresenter falls back to the first pending step when no step is running", () => {
  const workflowRun = buildWorkflowRun(["done", "pending", "pending"]);

  assert.equal(WorkflowRunPresenter.getCurrentStep(workflowRun)?.name, "Step 2");
});
