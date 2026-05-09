import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentAssignedTaskResultFormatter } from "./result_formatter.ts";
import { AgentAssignedTaskToolService } from "./service.ts";

/**
 * Lets an agent explicitly attach its current session to a task before doing the work. This keeps
 * task execution history durable even when the task was assigned through an agent-to-agent handoff.
 */
export class AgentStartTaskTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    taskId: Type.String(),
  });

  private readonly assignedTaskToolService: AgentAssignedTaskToolService;

  constructor(assignedTaskToolService: AgentAssignedTaskToolService) {
    this.assignedTaskToolService = assignedTaskToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentStartTaskTool.parameters> {
    return {
      description: "Start work on a task from the current agent session and create or attach its task run.",
      execute: async (_toolCallId, input) => {
        const result = await this.assignedTaskToolService.startTask(input);
        return {
          content: [{
            text: AgentAssignedTaskResultFormatter.formatStartedTask(result),
            type: "text",
          }],
          details: {
            sessionId: result.taskRun.sessionId,
            taskId: result.task.id,
            taskRunId: result.taskRun.id,
            type: "assigned_task",
          },
        };
      },
      label: "start_task",
      name: "start_task",
      parameters: AgentStartTaskTool.parameters,
      promptGuidelines: [
        "Use start_task before doing implementation or execution work for a task.",
      ],
      promptSnippet: "Start a task and attach this session to its run",
    };
  }
}
