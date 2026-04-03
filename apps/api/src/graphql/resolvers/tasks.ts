import { inject, injectable } from "inversify";
import { TaskService } from "../../services/task_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

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
  taskCategoryId: string | null;
  taskCategoryName: string | null;
  updatedAt: string;
};

/**
 * Lists company-scoped tasks together with category and assignee metadata so the kanban page can
 * render one complete board without stitching together separate task lookups client-side.
 */
@injectable()
export class TasksQueryResolver extends Resolver<GraphqlTaskRecord[]> {
  private readonly taskService: TaskService;

  constructor(
    @inject(TaskService) taskService: TaskService = new TaskService(),
  ) {
    super();
    this.taskService = taskService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlTaskRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const result = await this.taskService.listTasks(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
    });

    return result.tasks.map((task) => ({
      assignedAt: task.assignedAt?.toISOString() ?? null,
      assignee: task.assignee,
      createdAt: task.createdAt.toISOString(),
      description: task.description,
      id: task.id,
      name: task.name,
      status: task.status,
      taskCategoryId: task.taskCategoryId,
      taskCategoryName: task.taskCategoryName,
      updatedAt: task.updatedAt.toISOString(),
    }));
  };
}
