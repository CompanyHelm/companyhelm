import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentWorkflowToolService } from "./service.ts";
import { AgentUpdateWorkflowRunStepStatusTool } from "./update_step_status.ts";

/**
 * Contributes workflow-run execution helpers only when the current session is itself driving a
 * workflow run. This keeps the step-advancement tool scoped away from ordinary chat sessions.
 */
export class AgentWorkflowRunToolProvider extends AgentToolProviderInterface {
  private readonly workflowToolService: AgentWorkflowToolService;

  constructor(workflowToolService: AgentWorkflowToolService) {
    super();
    this.workflowToolService = workflowToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentUpdateWorkflowRunStepStatusTool(this.workflowToolService).createDefinition() as unknown as ToolDefinition,
    ];
  }
}
