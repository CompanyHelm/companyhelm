import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentListWorkflowsTool } from "./list_workflows.ts";
import { AgentWorkflowToolService } from "./service.ts";
import { AgentStartWorkflowTool } from "./start_workflow.ts";

/**
 * Groups the workflow discovery and kickoff tools behind one provider so every PI Mono session can
 * inspect startable workflows and create new workflow runs without bespoke bootstrap wiring.
 */
export class AgentWorkflowToolProvider extends AgentToolProviderInterface {
  private readonly workflowToolService: AgentWorkflowToolService;

  constructor(workflowToolService: AgentWorkflowToolService) {
    super();
    this.workflowToolService = workflowToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentListWorkflowsTool(this.workflowToolService).createDefinition() as unknown as ToolDefinition,
      new AgentStartWorkflowTool(this.workflowToolService).createDefinition() as unknown as ToolDefinition,
    ];
  }
}
