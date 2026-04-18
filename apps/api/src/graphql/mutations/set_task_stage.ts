import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { tasks } from "../../db/schema.ts";
import { TaskStageService } from "../../services/task_stage_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type TaskStatus = "draft" | "in_progress" | "completed";

type SetTaskStageMutationArguments = {
  input: {
    taskId: string;
    taskStageId: string;
  };
};

type TaskRecord = {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  taskStageId: string;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlTaskRecord = {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  taskStageId: string;
  taskStageName: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Moves one task between persisted kanban lanes by rewriting the required stage foreign key for
 * the authenticated company.
 */
@injectable()
export class SetTaskStageMutation extends Mutation<SetTaskStageMutationArguments, GraphqlTaskRecord> {
  private readonly taskStageService: TaskStageService;

  constructor(
    @inject(TaskStageService) taskStageService: TaskStageService = new TaskStageService(),
  ) {
    super();
    this.taskStageService = taskStageService;
  }

  protected resolve = async (
    arguments_: SetTaskStageMutationArguments,
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
    if (arguments_.input.taskStageId.length === 0) {
      throw new Error("taskStageId is required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const taskStageRecord = await this.taskStageService.resolveTaskStageRecord(
        tx,
        companyId,
        arguments_.input.taskStageId,
      );
      const taskRecords = await tx
        .update(tasks)
        .set({
          taskStageId: taskStageRecord.id,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tasks.companyId, companyId),
          eq(tasks.id, arguments_.input.taskId),
        ))
        .returning({
          id: tasks.id,
          name: tasks.name,
          description: tasks.description,
          status: tasks.status,
          taskStageId: tasks.taskStageId,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
        }) as TaskRecord[];
      const [taskRecord] = taskRecords;
      if (!taskRecord) {
        throw new Error("Task not found.");
      }

      return {
        id: taskRecord.id,
        name: taskRecord.name,
        description: taskRecord.description,
        status: taskRecord.status,
        taskStageId: taskRecord.taskStageId,
        taskStageName: taskStageRecord.name,
        createdAt: taskRecord.createdAt.toISOString(),
        updatedAt: taskRecord.updatedAt.toISOString(),
      };
    });
  };
}
