import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentWorkflowToolService } from "./service.ts";
import { AgentUpdateWorkflowRunStepStatusTool } from "./update_step_status.ts";

/**
 * Exposes workflow-run tools only for PI Mono sessions currently executing a workflow run.
 */
export class AgentWorkflowToolProvider extends AgentToolProviderInterface {
  private readonly workflowToolService: AgentWorkflowToolService;

  constructor(workflowToolService: AgentWorkflowToolService) {
    super();
    this.workflowToolService = workflowToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    const updateStepStatusTool = new AgentUpdateWorkflowRunStepStatusTool(this.workflowToolService)
      .createDefinition() as unknown as ToolDefinition;

    return [
      updateStepStatusTool,
    ];
  }
}
