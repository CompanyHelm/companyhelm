import type { TaskServiceListTasksResult, TaskServiceTask } from "../../../../../task_service.ts";

/**
 * Renders task tool outputs into compact transcript text blocks so the agent can inspect the task
 * catalog without the tools leaking raw database field names or verbose JSON into the transcript.
 */
export class AgentTaskResultFormatter {
  static formatCreatedTask(task: TaskServiceTask): string {
    return AgentTaskResultFormatter.formatTask(task);
  }

  static formatUpdatedTask(task: TaskServiceTask): string {
    return AgentTaskResultFormatter.formatTask(task);
  }

  static formatTaskList(result: TaskServiceListTasksResult): string {
    if (result.tasks.length === 0) {
      return [
        `totalCount: ${result.totalCount}`,
        `nextOffset: ${result.nextOffset ?? "none"}`,
        "tasks: none",
      ].join("\n");
    }

    return [
      `totalCount: ${result.totalCount}`,
      `nextOffset: ${result.nextOffset ?? "none"}`,
      "",
      result.tasks.map((task) => AgentTaskResultFormatter.formatTask(task)).join("\n\n"),
    ].join("\n");
  }

  private static formatTask(task: TaskServiceTask): string {
    return [
      `id: ${task.id}`,
      `name: ${task.name}`,
      `status: ${task.status}`,
      `taskStageName: ${task.taskStageName ?? "(no stage)"}`,
      `assignee: ${AgentTaskResultFormatter.formatAssignee(task)}`,
      `description: ${task.description ?? "(no description)"}`,
    ].join("\n");
  }

  private static formatAssignee(task: TaskServiceTask): string {
    if (!task.assignee) {
      return "(unassigned)";
    }

    const emailSuffix = task.assignee.email ? ` <${task.assignee.email}>` : "";
    return `${task.assignee.kind}:${task.assignee.name}${emailSuffix}`;
  }
}
