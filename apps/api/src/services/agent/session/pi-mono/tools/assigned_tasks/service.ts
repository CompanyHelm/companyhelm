import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import {
  type TaskServiceListTasksResult,
  type TaskServiceTask,
  TaskService,
} from "../../../../../task_service.ts";

export type AgentAssignedTaskListInput = {
  limit?: number | null;
  offset?: number | null;
  status?: string | null;
};

/**
 * Narrows task handling to the current agent's assigned work. It intentionally exposes only queue
 * inspection and status transitions, leaving assignment, stage changes, edits, creation, and delete
 * operations behind the Manage tasks system skill.
 */
export class AgentAssignedTaskToolService {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly companyId: string;
  private readonly agentId: string;
  private readonly sessionId: string;
  private readonly taskService: TaskService;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    sessionId: string,
    taskService: TaskService,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.agentId = agentId;
    this.sessionId = sessionId;
    this.taskService = taskService;
  }

  async listAssignedTasks(input: AgentAssignedTaskListInput): Promise<TaskServiceListTasksResult> {
    return this.taskService.listTasks(this.transactionProvider, {
      assignedAgentId: this.agentId,
      companyId: this.companyId,
      limit: input.limit,
      offset: input.offset,
      status: input.status,
    });
  }

  async updateAssignedTaskStatus(input: { status: string; taskId: string }): Promise<TaskServiceTask> {
    const task = await this.taskService.getTask(this.transactionProvider, {
      companyId: this.companyId,
      taskId: input.taskId,
    });
    if (task.assignee?.kind !== "agent" || task.assignee.id !== this.agentId) {
      throw new Error("Task is not assigned to this agent.");
    }

    return this.taskService.updateTaskStatus(this.transactionProvider, {
      actorAgentId: this.agentId,
      companyId: this.companyId,
      sessionId: this.sessionId,
      status: input.status,
      taskId: input.taskId,
    });
  }
}
