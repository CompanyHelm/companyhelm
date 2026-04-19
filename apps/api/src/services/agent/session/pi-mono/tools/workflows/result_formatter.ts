import type { AgentWorkflowToolRunState } from "./service.ts";

/**
 * Formats workflow tool responses as compact status text so the agent can confirm which runtime
 * step became active without reading raw database fields.
 */
export class AgentWorkflowResultFormatter {
  static formatRunningStepUpdate(runState: AgentWorkflowToolRunState): string {
    return [
      `workflowRunId: ${runState.workflowRunId}`,
      `runningStepRunId: ${runState.runningStep.id}`,
      `runningStepOrdinal: ${runState.runningStep.ordinal}`,
      `runningStepName: ${runState.runningStep.name}`,
    ].join("\n");
  }
}
