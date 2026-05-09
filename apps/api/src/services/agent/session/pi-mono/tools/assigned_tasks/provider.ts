import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentListAssignedTasksTool } from "./list_assigned_tasks.ts";
import { AgentAssignedTaskToolService } from "./service.ts";
import { AgentStartTaskTool } from "./start_task.ts";
import { AgentUpdateAssignedTaskStatusTool } from "./update_assigned_task_status.ts";

/**
 * Groups the narrow assigned-task handling tools so default sessions can expose routine progress
 * controls without exposing full task tracker management by default.
 */
export class AgentAssignedTaskToolProvider extends AgentToolProviderInterface {
  private readonly assignedTaskToolService: AgentAssignedTaskToolService;

  constructor(assignedTaskToolService: AgentAssignedTaskToolService) {
    super();
    this.assignedTaskToolService = assignedTaskToolService;
  }

  createToolDefinitions(): unknown[] {
    return [
      new AgentListAssignedTasksTool(this.assignedTaskToolService).createDefinition(),
      new AgentStartTaskTool(this.assignedTaskToolService).createDefinition(),
      new AgentUpdateAssignedTaskStatusTool(this.assignedTaskToolService).createDefinition(),
    ];
  }
}
