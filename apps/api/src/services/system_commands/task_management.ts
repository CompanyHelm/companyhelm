import type { SystemCommandExecutionContext } from "../system_command_service.ts";
import { TaskService } from "../task_service.ts";
import { SystemCommandInputReader } from "./input_reader.ts";
import { SystemCommandJsonSerializer } from "./json_serializer.ts";

type TaskListInput = {
  assignedAgentId?: string | null;
  limit?: number | null;
  offset?: number | null;
  status?: string | null;
};

/**
 * Exposes durable task tracker operations through the generic system-command boundary. The command
 * keeps task mutation power behind the Manage tasks system skill while delegating validation and
 * task-run synchronization to the shared task service used by GraphQL.
 */
export class TaskManagementSystemCommandService {
  private readonly inputReader = new SystemCommandInputReader();
  private readonly jsonSerializer = new SystemCommandJsonSerializer();
  private readonly taskService: TaskService;

  constructor(taskService: TaskService = new TaskService()) {
    this.taskService = taskService;
  }

  async execute(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    switch (commandId) {
      case "task.list":
        return this.listTasks(input, context);
      case "task.assigned.list":
        return this.listAssignedTasks(input, context);
      case "task.create":
        return this.createTask(input, context);
      case "task.update":
        return this.updateTask(input, context);
      case "task.delete":
        return this.deleteTask(input, context);
      default:
        throw new Error(`Unsupported task command ${commandId}.`);
    }
  }

  private async listTasks(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const tasks = await this.taskService.listTasks(context.transactionProvider, {
      ...this.readListInput(payload),
      companyId: context.companyId,
    });

    return this.jsonSerializer.serializeRecord(tasks);
  }

  private async listAssignedTasks(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const tasks = await this.taskService.listTasks(context.transactionProvider, {
      ...this.readListInput(payload),
      assignedAgentId: context.agentId,
      companyId: context.companyId,
    });

    return this.jsonSerializer.serializeRecord(tasks);
  }

  private async createTask(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const task = await this.taskService.createTask(context.transactionProvider, {
      assignedAgentId: this.inputReader.optionalNullableString(payload, "assignedAgentId"),
      assignedUserId: this.inputReader.optionalNullableString(payload, "assignedUserId"),
      companyId: context.companyId,
      createdByAgentId: context.agentId,
      description: this.inputReader.optionalNullableString(payload, "description"),
      name: this.inputReader.requireString(payload, "name"),
      status: this.inputReader.optionalNullableString(payload, "status"),
      taskStageId: this.inputReader.optionalNullableString(payload, "taskStageId"),
    });

    return this.jsonSerializer.serializeRecord({ task });
  }

  private async updateTask(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const task = await this.taskService.updateTask(context.transactionProvider, {
      assignedAgentId: this.inputReader.optionalNullableString(payload, "assignedAgentId"),
      assignedUserId: this.inputReader.optionalNullableString(payload, "assignedUserId"),
      actorAgentId: context.agentId,
      companyId: context.companyId,
      description: this.inputReader.optionalNullableString(payload, "description"),
      name: this.inputReader.optionalNullableString(payload, "name"),
      sessionId: context.sessionId,
      status: this.inputReader.optionalNullableString(payload, "status"),
      taskStageId: this.inputReader.optionalNullableString(payload, "taskStageId"),
      taskId: this.inputReader.requireString(payload, "taskId"),
    });

    return this.jsonSerializer.serializeRecord({ task });
  }

  private async deleteTask(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const task = await this.taskService.deleteTask(context.transactionProvider, {
      companyId: context.companyId,
      taskId: this.inputReader.requireString(payload, "taskId"),
    });

    return this.jsonSerializer.serializeRecord({ task });
  }

  private readListInput(payload: Record<string, unknown>): TaskListInput {
    return {
      assignedAgentId: this.inputReader.optionalNullableString(payload, "assignedAgentId"),
      limit: this.readBoundedInteger(payload, "limit", 1, 100),
      offset: this.readBoundedInteger(payload, "offset", 0, Number.MAX_SAFE_INTEGER),
      status: this.inputReader.optionalNullableString(payload, "status"),
    };
  }

  private readBoundedInteger(
    payload: Record<string, unknown>,
    key: string,
    minimum: number,
    maximum: number,
  ): number | undefined {
    const value = this.inputReader.optionalInteger(payload, key);
    if (value === undefined) {
      return undefined;
    }
    if (value < minimum || value > maximum) {
      throw new Error(`${key} must be between ${minimum} and ${maximum}.`);
    }

    return value;
  }
}
