import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentWorkflowToolService } from "./service.ts";
import { AgentUpdateWorkflowRunningStepTool } from "./update_running_step.ts";

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
    return [
      new AgentUpdateWorkflowRunningStepTool(this.workflowToolService).createDefinition(),
    ];
  }
}
