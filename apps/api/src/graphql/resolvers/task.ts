import { inject, injectable } from "inversify";
import { TaskService } from "../../services/task_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type TaskQueryArguments = {
  id: string;
};

type GraphqlTaskAssignee = {
  email: string | null;
  id: string;
  kind: "agent" | "user";
  name: string;
};

type GraphqlTaskRecord = {
  assignedAt: string | null;
  assignee: GraphqlTaskAssignee | null;
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  status: "draft" | "in_progress" | "completed";
  taskStageId: string;
  taskStageName: string;
  updatedAt: string;
};

/**
 * Loads one company-scoped task with its assignee and stage metadata so the task detail page
 * can edit the persisted record without reconstructing task state from the kanban board query.
 */
@injectable()
export class TaskQueryResolver {
  private readonly taskService: TaskService;

  constructor(
    @inject(TaskService) taskService: TaskService = new TaskService(),
  ) {
    this.taskService = taskService;
  }

  execute = async (
    _root: unknown,
    arguments_: TaskQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlTaskRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.id.length === 0) {
      throw new Error("id is required.");
    }

    const task = await this.taskService.getTask(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      taskId: arguments_.id,
    });

    return {
      assignedAt: task.assignedAt?.toISOString() ?? null,
      assignee: task.assignee,
      createdAt: task.createdAt.toISOString(),
      description: task.description,
      id: task.id,
      name: task.name,
      status: task.status,
      taskStageId: task.taskStageId,
      taskStageName: task.taskStageName,
      updatedAt: task.updatedAt.toISOString(),
    };
  };
}
