import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentTaskResultFormatter } from "./result_formatter.ts";
import { AgentTaskToolService } from "./service.ts";

/**
 * Lists company tasks for the agent with simple pagination and task-level filters so the model can
 * browse a larger task catalog incrementally instead of pulling the full backlog at once.
 */
export class AgentListTasksTool {
  private static readonly parameters = Type.Object({
    assignedAgentId: Type.Optional(Type.String()),
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

  createDefinition(): ToolDefinition<typeof AgentListTasksTool.parameters> {
    return {
      description:
        "List company tasks with pagination. Supports filtering by task status and by the assigned agent id.",
      execute: async (_toolCallId, input) => {
        const tasks = await this.taskToolService.listTasks(input);
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
      label: "list_tasks",
      name: "list_tasks",
      parameters: AgentListTasksTool.parameters,
      promptGuidelines: [
        "Use list_tasks to inspect the broader company task backlog in pages instead of pulling every task at once.",
      ],
      promptSnippet: "List tasks with pagination",
    };
  }
}
