import type {
  AgentWorkflowToolListItem,
  AgentWorkflowToolStartResult,
  AgentWorkflowToolRunState,
} from "./service.ts";

/**
 * Formats workflow tool responses as compact transcript text so agents can browse workflow
 * definitions, confirm kickoff metadata, and inspect in-run status changes without raw JSON.
 */
export class AgentWorkflowResultFormatter {
  static formatWorkflowList(workflows: AgentWorkflowToolListItem[]): string {
    if (workflows.length === 0) {
      return "workflows: none";
    }

    return workflows.map((workflow) => {
      const inputBlock = workflow.inputs.length === 0
        ? "inputs: none"
        : workflow.inputs.map((input) => {
          return [
            `input: ${input.name}`,
            `required: ${String(input.isRequired)}`,
            `description: ${input.description ?? "(no description)"}`,
            `defaultValue: ${input.defaultValue ?? "(no default)"}`,
          ].join("\n");
        }).join("\n\n");

      return [
        `id: ${workflow.id}`,
        `name: ${workflow.name}`,
        `description: ${workflow.description ?? "(no description)"}`,
        inputBlock,
      ].join("\n");
    }).join("\n\n");
  }

  static formatStartedWorkflow(startedWorkflow: AgentWorkflowToolStartResult): string {
    return [
      `workflowRunId: ${startedWorkflow.workflowRun.id}`,
      `workflowDefinitionId: ${startedWorkflow.workflowRun.workflowDefinitionId ?? "(unknown)"}`,
      `status: ${startedWorkflow.workflowRun.status}`,
      `startedAt: ${startedWorkflow.workflowRun.startedAt?.toISOString() ?? "(not started)"}`,
      `executionSessionId: ${startedWorkflow.workflowRun.sessionId}`,
      `parentWorkflowRunId: ${startedWorkflow.parentWorkflowRunId ?? "none"}`,
    ].join("\n");
  }

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
