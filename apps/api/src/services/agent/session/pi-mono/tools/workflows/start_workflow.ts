import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentWorkflowResultFormatter } from "./result_formatter.ts";
import { AgentWorkflowToolService } from "./service.ts";

/**
 * Starts a workflow run for the current agent. Callers provide the workflow definition ID plus a
 * one-shot input object that the service normalizes into the text-based workflow runtime format.
 */
export class AgentStartWorkflowTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    input: Type.Optional(Type.Record(
      Type.String(),
      Type.Any(),
      {
        description: "Optional workflow input payload keyed by input name. Values are converted into workflow text inputs before launch.",
      },
    )),
    workflowDefinitionId: Type.String({
      description: "The workflow definition ID to start.",
    }),
  });

  private readonly workflowToolService: AgentWorkflowToolService;

  constructor(workflowToolService: AgentWorkflowToolService) {
    this.workflowToolService = workflowToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentStartWorkflowTool.parameters> {
    return {
      description: "Start a workflow for the current agent using the workflow definition ID plus the full input payload in one call.",
      execute: async (_toolCallId, input) => {
        const startedWorkflow = await this.workflowToolService.startWorkflow({
          input: input.input ?? {},
          workflowDefinitionId: input.workflowDefinitionId,
        });
        return {
          content: [{
            text: AgentWorkflowResultFormatter.formatStartedWorkflow(startedWorkflow),
            type: "text",
          }],
          details: {
            executionSessionId: startedWorkflow.workflowRun.sessionId,
            parentWorkflowRunId: startedWorkflow.parentWorkflowRunId,
            startedAt: startedWorkflow.workflowRun.startedAt?.toISOString() ?? null,
            status: startedWorkflow.workflowRun.status,
            type: "workflow_run",
            workflowDefinitionId: startedWorkflow.workflowRun.workflowDefinitionId,
            workflowRunId: startedWorkflow.workflowRun.id,
          },
        };
      },
      label: "start_workflow",
      name: "start_workflow",
      parameters: AgentStartWorkflowTool.parameters,
      promptGuidelines: [
        "Use start_workflow after you know the workflow definition ID and have assembled the complete workflow input payload.",
        "Pass the full workflow input object in one call; the tool converts each value into the text format used by workflow execution.",
        "If this session is already executing a workflow run, the new workflow run is linked to the current run as its parent lineage.",
      ],
      promptSnippet: "Start a workflow run",
    };
  }
}
