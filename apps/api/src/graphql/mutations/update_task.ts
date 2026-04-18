import { inject, injectable } from "inversify";
import { TaskService } from "../../services/task_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateTaskMutationArguments = {
  input: {
    assignedAgentId?: string | null;
    assignedUserId?: string | null;
    description?: string | null;
    name?: string | null;
    status?: string | null;
    taskStageId?: string | null;
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
  taskStageId: string;
  taskStageName: string;
  updatedAt: string;
};

/**
 * Updates one company task record while reusing the shared task service for assignee validation,
 * stage lookups, and task serialization so detail-page edits stay consistent with task tools.
 */
@injectable()
export class UpdateTaskMutation extends Mutation<UpdateTaskMutationArguments, GraphqlTaskRecord> {
  private readonly taskService: TaskService;

  constructor(
    @inject(TaskService) taskService: TaskService = new TaskService(),
  ) {
    super();
    this.taskService = taskService;
  }

  protected resolve = async (
    arguments_: UpdateTaskMutationArguments,
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

    const task = await this.taskService.updateTask(context.app_runtime_transaction_provider, {
      assignedAgentId: arguments_.input.assignedAgentId,
      assignedUserId: arguments_.input.assignedUserId,
      companyId: context.authSession.company.id,
      description: arguments_.input.description,
      name: arguments_.input.name,
      status: arguments_.input.status,
      taskStageId: arguments_.input.taskStageId,
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
