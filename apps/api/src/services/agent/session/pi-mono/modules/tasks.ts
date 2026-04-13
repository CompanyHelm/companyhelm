import { TaskService } from "../../../../task_service.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentTaskToolProvider } from "../tools/tasks/provider.ts";
import { AgentTaskToolService } from "../tools/tasks/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Owns the task-management tool slice and binds the generic company task service to the current
 * company and agent identity once per prompt run.
 */
export class TasksSessionModule extends AgentSessionModuleInterface {
  private readonly taskService: TaskService;

  constructor(taskService: TaskService = new TaskService()) {
    super();
    this.taskService = taskService;
  }

  getName(): string {
    return "tasks";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentTaskToolProvider(
        new AgentTaskToolService(
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
