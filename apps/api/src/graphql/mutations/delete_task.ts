import { inject, injectable } from "inversify";
import { TaskService } from "../../services/task_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteTaskMutationArguments = {
  input: {
    taskId: string;
  };
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
  taskStageId: string | null;
  taskStageName: string | null;
  updatedAt: string;
};

/**
 * Deletes one task record and returns the deleted task snapshot so Relay clients can remove the
 * matching normalized record without first refetching the board.
 */
@injectable()
export class DeleteTaskMutation extends Mutation<DeleteTaskMutationArguments, GraphqlTaskRecord> {
  private readonly taskService: TaskService;

  constructor(
    @inject(TaskService) taskService: TaskService = new TaskService(),
  ) {
    super();
    this.taskService = taskService;
  }

  protected resolve = async (
    arguments_: DeleteTaskMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlTaskRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.taskId.length === 0) {
      throw new Error("taskId is required.");
    }

    const task = await this.taskService.deleteTask(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      taskId: arguments_.input.taskId,
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
