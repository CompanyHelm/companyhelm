import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentTaskResultFormatter } from "./result_formatter.ts";
import { AgentTaskToolService } from "./service.ts";

/**
 * Updates the lifecycle status of an existing task so the agent can move tracked work between
 * draft, active, and completed states from within the current session.
 */
export class AgentUpdateTaskStatusTool {
  private static readonly parameters = Type.Object({
    status: Type.Union([
      Type.Literal("draft"),
      Type.Literal("in_progress"),
      Type.Literal("completed"),
    ]),
    taskId: Type.String(),
  });

  private readonly taskToolService: AgentTaskToolService;

  constructor(taskToolService: AgentTaskToolService) {
    this.taskToolService = taskToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentUpdateTaskStatusTool.parameters> {
    return {
      description: "Update the status of an existing company task.",
      execute: async (_toolCallId, input) => {
        const task = await this.taskToolService.updateTaskStatus(input);
        return {
          content: [{
            text: AgentTaskResultFormatter.formatUpdatedTask(task),
            type: "text",
          }],
          details: {
            taskId: task.id,
            type: "task",
          },
        };
      },
      label: "update_task_status",
      name: "update_task_status",
      parameters: AgentUpdateTaskStatusTool.parameters,
      promptGuidelines: [
        "Use update_task_status when task work starts, stalls, or completes and the task tracker should reflect that change.",
      ],
      promptSnippet: "Update a task status",
    };
  }
}
