import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentCreateTaskTool } from "./create_task.ts";
import { AgentListAssignedTasksTool } from "./list_assigned_tasks.ts";
import { AgentListTasksTool } from "./list_tasks.ts";
import { AgentTaskToolService } from "./service.ts";
import { AgentUpdateTaskStatusTool } from "./update_task_status.ts";

/**
 * Groups the task-management tools behind one provider so PI Mono can expose task workflows
 * without the session bootstrap needing to know each task tool individually.
 */
export class AgentTaskToolProvider extends AgentToolProviderInterface {
  private readonly taskToolService: AgentTaskToolService;

  constructor(taskToolService: AgentTaskToolService) {
    super();
    this.taskToolService = taskToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentListTasksTool(this.taskToolService).createDefinition(),
      new AgentListAssignedTasksTool(this.taskToolService).createDefinition(),
      new AgentCreateTaskTool(this.taskToolService).createDefinition(),
      new AgentUpdateTaskStatusTool(this.taskToolService).createDefinition(),
    ];
  }
}
