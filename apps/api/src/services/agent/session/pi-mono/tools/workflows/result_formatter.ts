import type { AgentWorkflowToolRunState } from "./service.ts";

/**
 * Formats workflow tool responses as compact status text so the agent can confirm the updated
 * runtime step and whether the workflow run has been completed.
 */
export class AgentWorkflowResultFormatter {
  static formatStepStatusUpdate(runState: AgentWorkflowToolRunState): string {
    return [
      `workflowRunId: ${runState.workflowRunId}`,
      `workflowRunStatus: ${runState.workflowRunStatus}`,
      `workflowRunStepId: ${runState.step.id}`,
      `workflowRunStepOrdinal: ${runState.step.ordinal}`,
      `workflowRunStepName: ${runState.step.name}`,
      `workflowRunStepStatus: ${runState.step.status}`,
      `allStepsDone: ${String(runState.allStepsDone)}`,
    ].join("\n");
  }
}
