import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentWorkflowResultFormatter } from "./result_formatter.ts";
import { AgentWorkflowToolService } from "./service.ts";

/**
 * Advances the current workflow run to the next runtime step id after the agent completes the
 * current step. The service enforces current-session ownership and one-step-at-a-time movement.
 */
export class AgentUpdateWorkflowRunningStepTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    workflowRunStepId: Type.String({
      description: "The workflow run step ID to make the current running step.",
    }),
  });

  private readonly workflowToolService: AgentWorkflowToolService;

  constructor(workflowToolService: AgentWorkflowToolService) {
    this.workflowToolService = workflowToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentUpdateWorkflowRunningStepTool.parameters> {
    return {
      description: "Advance the current workflow run to the next workflow run step.",
      execute: async (_toolCallId, input) => {
        const runState = await this.workflowToolService.updateRunningStep(input);
        return {
          content: [{
            text: AgentWorkflowResultFormatter.formatRunningStepUpdate(runState),
            type: "text",
          }],
          details: {
            runningStepRunId: runState.runningStep.id,
            type: "workflow",
            workflowRunId: runState.workflowRunId,
          },
        };
      },
      label: "update_workflow_running_step",
      name: "update_workflow_running_step",
      parameters: AgentUpdateWorkflowRunningStepTool.parameters,
      promptGuidelines: [
        "Use update_workflow_running_step after completing the current workflow step and before starting the next step.",
        "Advance only to the next workflow run step ID in the ordered workflow run step list.",
      ],
      promptSnippet: "Advance workflow running step",
    };
  }
}
