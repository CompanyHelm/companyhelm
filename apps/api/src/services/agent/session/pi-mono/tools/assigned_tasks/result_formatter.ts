import type {
  TaskServiceListTasksResult,
  TaskServiceStartTaskResult,
  TaskServiceTask,
} from "../../../../../task_service.ts";

/**
 * Renders assigned-task tool responses into compact transcript text so agents can inspect their
 * own queue without receiving the broader company task management command surface.
 */
export class AgentAssignedTaskResultFormatter {
  static formatTaskList(result: TaskServiceListTasksResult): string {
    return [
      `totalCount: ${result.totalCount}`,
      `nextOffset: ${result.nextOffset ?? "none"}`,
      result.tasks.length === 0
        ? "tasks: none"
        : result.tasks.map((task) => this.formatTask(task)).join("\n---\n"),
    ].join("\n");
  }

  static formatUpdatedTask(task: TaskServiceTask): string {
    return [
      "updated task:",
      this.formatTask(task),
    ].join("\n");
  }

  static formatStartedTask(result: TaskServiceStartTaskResult): string {
    return [
      "started task:",
      this.formatTask(result.task),
      `taskRunId: ${result.taskRun.id}`,
      `sessionId: ${result.taskRun.sessionId ?? "(none)"}`,
      `taskRunStatus: ${result.taskRun.status}`,
    ].join("\n");
  }

  private static formatTask(task: TaskServiceTask): string {
    return [
      `id: ${task.id}`,
      `name: ${task.name}`,
      `status: ${task.status}`,
      `stage: ${task.taskStageName}`,
      `description: ${task.description ?? "(none)"}`,
      `completedAt: ${task.completedAt?.toISOString() ?? "(none)"}`,
      `updatedAt: ${task.updatedAt.toISOString()}`,
    ].join("\n");
  }
}
