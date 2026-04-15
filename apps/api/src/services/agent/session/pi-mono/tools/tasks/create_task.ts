import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentTaskResultFormatter } from "./result_formatter.ts";
import { AgentTaskToolService } from "./service.ts";

/**
 * Creates company tasks from the agent runtime so the model can capture follow-up work without
 * leaving the current chat session.
 */
export class AgentCreateTaskTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    assignedAgentId: Type.Optional(Type.String()),
    assignedUserId: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    name: Type.String(),
    status: Type.Optional(Type.Union([
      Type.Literal("draft"),
      Type.Literal("in_progress"),
      Type.Literal("completed"),
    ])),
    taskStageId: Type.Optional(Type.String()),
  });

  private readonly taskToolService: AgentTaskToolService;

  constructor(taskToolService: AgentTaskToolService) {
    this.taskToolService = taskToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentCreateTaskTool.parameters> {
    return {
      description:
        "Create a company task. Optionally assign it to a human user or an agent by id, but never both at once.",
      execute: async (_toolCallId, input) => {
        const task = await this.taskToolService.createTask(input);
        return {
          content: [{
            text: AgentTaskResultFormatter.formatCreatedTask(task),
            type: "text",
          }],
          details: {
            taskId: task.id,
            type: "task",
          },
        };
      },
      label: "create_task",
      name: "create_task",
      parameters: AgentCreateTaskTool.parameters,
      promptGuidelines: [
        "Use create_task when the session uncovers follow-up work that should be tracked outside the chat transcript.",
      ],
      promptSnippet: "Create a company task",
    };
  }
}
