import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentWorkflowResultFormatter } from "./result_formatter.ts";
import { AgentWorkflowToolService } from "./service.ts";

/**
 * Updates the agent-visible status of one workflow run step. The service keeps the mutation scoped
 * to the current session and completes the parent workflow run once every step is marked done.
 */
export class AgentUpdateWorkflowRunStepStatusTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    status: Type.Union([
      Type.Literal("pending"),
      Type.Literal("running"),
      Type.Literal("done"),
    ], {
      description: "The next status for the workflow run step.",
    }),
    workflowRunStepId: Type.String({
      description: "The workflow run step ID to update.",
    }),
  });

  private readonly workflowToolService: AgentWorkflowToolService;

  constructor(workflowToolService: AgentWorkflowToolService) {
    this.workflowToolService = workflowToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentUpdateWorkflowRunStepStatusTool.parameters> {
    return {
      description: "Set the status for a workflow run step.",
      execute: async (_toolCallId, input) => {
        const runState = await this.workflowToolService.updateStepStatus(input);
        return {
          content: [{
            text: AgentWorkflowResultFormatter.formatStepStatusUpdate(runState),
            type: "text",
          }],
          details: {
            allStepsDone: runState.allStepsDone,
            status: runState.step.status,
            type: "workflow",
            workflowRunId: runState.workflowRunId,
            workflowRunStatus: runState.workflowRunStatus,
            workflowRunStepId: runState.step.id,
          },
        };
      },
      label: "update_workflow_run_step_status",
      name: "update_workflow_run_step_status",
      parameters: AgentUpdateWorkflowRunStepStatusTool.parameters,
      promptGuidelines: [
        "Use update_workflow_run_step_status with status running before working on a workflow run step.",
        "Use update_workflow_run_step_status with status done after completing a workflow run step.",
      ],
      promptSnippet: "Update workflow run step status",
    };
  }
}
