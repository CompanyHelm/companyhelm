import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentTaskResultFormatter } from "./result_formatter.ts";
import { AgentTaskToolService } from "./service.ts";

/**
 * Lists only the tasks currently assigned to the running agent so it can inspect its own workload
 * without having to remember or pass its agent id into the more general list-tasks tool.
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

  private readonly taskToolService: AgentTaskToolService;

  constructor(taskToolService: AgentTaskToolService) {
    this.taskToolService = taskToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListAssignedTasksTool.parameters> {
    return {
      description: "List tasks that are currently assigned to this agent.",
      execute: async (_toolCallId, input) => {
        const tasks = await this.taskToolService.listAssignedTasks(input);
        return {
          content: [{
            text: AgentTaskResultFormatter.formatTaskList(tasks),
            type: "text",
          }],
          details: {
            nextOffset: tasks.nextOffset,
            totalCount: tasks.totalCount,
            type: "tasks",
          },
        };
      },
      label: "list_assigned_tasks",
      name: "list_assigned_tasks",
      parameters: AgentListAssignedTasksTool.parameters,
      promptGuidelines: [
        "Use list_assigned_tasks when you only need the tasks assigned to the current agent.",
      ],
      promptSnippet: "List tasks assigned to this agent",
    };
  }
}
