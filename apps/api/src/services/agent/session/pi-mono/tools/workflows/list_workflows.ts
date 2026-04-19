import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentWorkflowResultFormatter } from "./result_formatter.ts";
import { AgentWorkflowToolService } from "./service.ts";

/**
 * Lists workflow definitions that the current agent session can start. The output includes each
 * workflow's declared inputs so agents can prepare a valid one-shot kickoff call.
 */
export class AgentListWorkflowsTool {
  private static readonly parameters = AgentToolParameterSchema.object({});

  private readonly workflowToolService: AgentWorkflowToolService;

  constructor(workflowToolService: AgentWorkflowToolService) {
    this.workflowToolService = workflowToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListWorkflowsTool.parameters> {
    return {
      description: "List the enabled workflows available to the current agent session, including their input definitions.",
      execute: async () => {
        const workflows = await this.workflowToolService.listWorkflows();
        return {
          content: [{
            text: AgentWorkflowResultFormatter.formatWorkflowList(workflows),
            type: "text",
          }],
          details: {
            type: "workflow_catalog",
            workflowCount: workflows.length,
            workflowIds: workflows.map((workflow) => workflow.id),
          },
        };
      },
      label: "list_workflows",
      name: "list_workflows",
      parameters: AgentListWorkflowsTool.parameters,
      promptGuidelines: [
        "Use list_workflows before starting a workflow when you need to discover the available workflow IDs or required inputs.",
        "The result includes each enabled workflow's input definitions so you can prepare the full kickoff payload in one call.",
      ],
      promptSnippet: "List available workflows",
    };
  }
}
