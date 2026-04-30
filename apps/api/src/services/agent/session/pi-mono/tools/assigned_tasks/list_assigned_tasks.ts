import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentAssignedTaskResultFormatter } from "./result_formatter.ts";
import { AgentAssignedTaskToolService } from "./service.ts";

/**
 * Lists only the tasks assigned to the current agent so routine task handling stays available
 * without granting company-wide task management authority.
 */
export class AgentListAssignedTasksTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    limit: Type.Optional(Type.Integer({ maximum: 100, minimum: 1 })),
    offset: Type.Optional(Type.Integer({ minimum: 0 })),
    status: Type.Optional(Type.Union([
      Type.Literal("draft"),
      Type.Literal("in_progress"),
      Type.Literal("completed"),
    ])),
  });

  private readonly assignedTaskToolService: AgentAssignedTaskToolService;

  constructor(assignedTaskToolService: AgentAssignedTaskToolService) {
    this.assignedTaskToolService = assignedTaskToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListAssignedTasksTool.parameters> {
    return {
      description: "List tasks assigned to the current agent with pagination and optional status filtering.",
      execute: async (_toolCallId, input) => {
        const tasks = await this.assignedTaskToolService.listAssignedTasks(input);
        return {
          content: [{
            text: AgentAssignedTaskResultFormatter.formatTaskList(tasks),
            type: "text",
          }],
          details: {
            nextOffset: tasks.nextOffset,
            totalCount: tasks.totalCount,
            type: "assigned_tasks",
          },
        };
      },
      label: "list_assigned_tasks",
      name: "list_assigned_tasks",
      parameters: AgentListAssignedTasksTool.parameters,
      promptGuidelines: [
        "Use list_assigned_tasks to inspect only the current agent's assigned task queue.",
      ],
      promptSnippet: "List tasks assigned to this agent",
    };
  }
}
