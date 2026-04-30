import { TaskService } from "../../../../task_service.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentAssignedTaskToolProvider } from "../tools/assigned_tasks/provider.ts";
import { AgentAssignedTaskToolService } from "../tools/assigned_tasks/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Adds built-in handling for the current agent's assigned task queue. Broader task tracker changes
 * remain gated by the Manage tasks system skill.
 */
export class AssignedTasksSessionModule extends AgentSessionModuleInterface {
  private readonly taskService: TaskService;

  constructor(taskService: TaskService = new TaskService()) {
    super();
    this.taskService = taskService;
  }

  getName(): string {
    return "assigned_tasks";
  }

  async createAppendSystemPrompts(): Promise<string[]> {
    return [];
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentAssignedTaskToolProvider(
        new AgentAssignedTaskToolService(
          context.transactionProvider,
          context.companyId,
          context.agentId,
          context.sessionId,
          this.taskService,
        ),
      ),
    ];
  }
}
