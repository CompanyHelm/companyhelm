import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import {
  type TaskServiceListTasksResult,
  type TaskServiceTask,
  TaskService,
} from "../../../task_service.ts";

export type AgentTaskToolCreateTaskInput = {
  assignedAgentId?: string | null;
  assignedUserId?: string | null;
  description?: string | null;
  name: string;
  status?: string | null;
  taskCategoryId?: string | null;
};

export type AgentTaskToolListTasksInput = {
  assignedAgentId?: string | null;
  limit?: number | null;
  offset?: number | null;
  status?: string | null;
};

/**
 * Adapts the shared company task service to the current PI Mono prompt run. It binds company and
 * current-agent identity once so individual tools only have to describe task-specific inputs.
 */
export class AgentTaskToolService {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly companyId: string;
  private readonly agentId: string;
  private readonly taskService: TaskService;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    taskService: TaskService,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.agentId = agentId;
    this.taskService = taskService;
  }

  async createTask(input: AgentTaskToolCreateTaskInput): Promise<TaskServiceTask> {
    return this.taskService.createTask(this.transactionProvider, {
      assignedAgentId: input.assignedAgentId,
      assignedUserId: input.assignedUserId,
      companyId: this.companyId,
      description: input.description,
      name: input.name,
      status: input.status,
      taskCategoryId: input.taskCategoryId,
    });
  }

  async listAssignedTasks(input: Omit<AgentTaskToolListTasksInput, "assignedAgentId">): Promise<TaskServiceListTasksResult> {
    return this.taskService.listTasks(this.transactionProvider, {
      assignedAgentId: this.agentId,
      companyId: this.companyId,
      limit: input.limit,
      offset: input.offset,
      status: input.status,
    });
  }

  async listTasks(input: AgentTaskToolListTasksInput): Promise<TaskServiceListTasksResult> {
    return this.taskService.listTasks(this.transactionProvider, {
      assignedAgentId: input.assignedAgentId,
      companyId: this.companyId,
      limit: input.limit,
      offset: input.offset,
      status: input.status,
    });
  }

  async updateTaskStatus(input: { status: string; taskId: string }): Promise<TaskServiceTask> {
    return this.taskService.updateTaskStatus(this.transactionProvider, {
      companyId: this.companyId,
      status: input.status,
      taskId: input.taskId,
    });
  }
}
