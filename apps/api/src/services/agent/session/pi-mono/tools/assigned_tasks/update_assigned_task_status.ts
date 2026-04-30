import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentAssignedTaskResultFormatter } from "./result_formatter.ts";
import { AgentAssignedTaskToolService } from "./service.ts";

/**
 * Lets an agent report progress on its own assigned work while preventing broader task edits,
 * assignment changes, stage moves, or deletion outside the Manage tasks system skill.
 */
export class AgentUpdateAssignedTaskStatusTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    status: Type.Union([
      Type.Literal("draft"),
      Type.Literal("in_progress"),
      Type.Literal("completed"),
    ]),
    taskId: Type.String(),
  });

  private readonly assignedTaskToolService: AgentAssignedTaskToolService;

  constructor(assignedTaskToolService: AgentAssignedTaskToolService) {
    this.assignedTaskToolService = assignedTaskToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentUpdateAssignedTaskStatusTool.parameters> {
    return {
      description: "Update the status of a task assigned to the current agent.",
      execute: async (_toolCallId, input) => {
        const task = await this.assignedTaskToolService.updateAssignedTaskStatus(input);
        return {
          content: [{
            text: AgentAssignedTaskResultFormatter.formatUpdatedTask(task),
            type: "text",
          }],
          details: {
            taskId: task.id,
            type: "assigned_task",
          },
        };
      },
      label: "update_assigned_task_status",
      name: "update_assigned_task_status",
      parameters: AgentUpdateAssignedTaskStatusTool.parameters,
      promptGuidelines: [
        "Use update_assigned_task_status only for tasks currently assigned to this agent.",
      ],
      promptSnippet: "Update an assigned task status",
    };
  }
}
