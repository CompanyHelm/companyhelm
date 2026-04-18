import { inject, injectable } from "inversify";
import { TaskService } from "../../services/task_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateTaskMutationArguments = {
  input: {
    assignedAgentId?: string | null;
    assignedUserId?: string | null;
    description?: string | null;
    name: string;
    status?: string | null;
    taskStageId?: string | null;
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
 * Creates one company-scoped task and validates the optional stage plus typed assignee before
 * persisting it so both the web UI and agent tools share the same task rules.
 */
@injectable()
export class CreateTaskMutation extends Mutation<CreateTaskMutationArguments, GraphqlTaskRecord> {
  private readonly taskService: TaskService;

  constructor(
    @inject(TaskService) taskService: TaskService = new TaskService(),
  ) {
    super();
    this.taskService = taskService;
  }

  protected resolve = async (
    arguments_: CreateTaskMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlTaskRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const task = await this.taskService.createTask(context.app_runtime_transaction_provider, {
      assignedAgentId: arguments_.input.assignedAgentId,
      assignedUserId: arguments_.input.assignedUserId,
      companyId: context.authSession.company.id,
      createdByUserId: context.authSession.user.id,
      description: arguments_.input.description,
      name: arguments_.input.name,
      status: arguments_.input.status,
      taskStageId: arguments_.input.taskStageId,
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
