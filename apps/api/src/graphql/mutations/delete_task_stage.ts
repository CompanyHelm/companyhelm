import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { taskStages, tasks } from "../../db/schema.ts";
import { TaskStageService } from "../../services/task_stage_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteTaskStageMutationArguments = {
  input: {
    id: string;
  };
};

type TaskStageRecord = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TaskStageTaskRecord = {
  id: string;
};

type GraphqlTaskStageRecord = {
  id: string;
  name: string;
  isDefault: boolean;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

/**
 * Deletes one persisted kanban stage for the authenticated company. Tasks keep their records and
 * fall back to the no-stage column because the task foreign key is defined with `onDelete: set null`.
 */
@injectable()
export class DeleteTaskStageMutation extends Mutation<
  DeleteTaskStageMutationArguments,
  GraphqlTaskStageRecord
> {
  private readonly taskStageService: TaskStageService;

  constructor(
    @inject(TaskStageService) taskStageService: TaskStageService = new TaskStageService(),
  ) {
    super();
    this.taskStageService = taskStageService;
  }

  protected resolve = async (
    arguments_: DeleteTaskStageMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlTaskStageRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.id.length === 0) {
      throw new Error("id is required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const defaultTaskStage = await this.taskStageService.requireDefaultTaskStage(
        tx,
        companyId,
      );
      const [taskStageRecord] = await selectableDatabase
        .select({
          id: taskStages.id,
          isDefault: taskStages.isDefault,
          name: taskStages.name,
          createdAt: taskStages.createdAt,
          updatedAt: taskStages.updatedAt,
        })
        .from(taskStages)
        .where(and(
          eq(taskStages.companyId, companyId),
          eq(taskStages.id, arguments_.input.id),
        )) as TaskStageRecord[];
      if (!taskStageRecord) {
        throw new Error("Task stage not found.");
      }
      if (taskStageRecord.isDefault) {
        throw new Error("Default task stage cannot be deleted.");
      }

      const assignedTaskRecords = await selectableDatabase
        .select({
          id: tasks.id,
        })
        .from(tasks)
        .where(and(
          eq(tasks.companyId, companyId),
          eq(tasks.taskStageId, arguments_.input.id),
        )) as TaskStageTaskRecord[];
      await updatableDatabase
        .update(tasks)
        .set({
          taskStageId: defaultTaskStage.id,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tasks.companyId, companyId),
          eq(tasks.taskStageId, arguments_.input.id),
        ));
      const [deletedTaskStageRecord] = await deletableDatabase
        .delete(taskStages)
        .where(and(
          eq(taskStages.companyId, companyId),
          eq(taskStages.id, arguments_.input.id),
        ))
        .returning?.({
          id: taskStages.id,
          isDefault: taskStages.isDefault,
          name: taskStages.name,
          createdAt: taskStages.createdAt,
          updatedAt: taskStages.updatedAt,
        }) as TaskStageRecord[];
      if (!deletedTaskStageRecord) {
        throw new Error("Task stage not found.");
      }

      return {
        id: deletedTaskStageRecord.id,
        isDefault: deletedTaskStageRecord.isDefault,
        name: deletedTaskStageRecord.name,
        taskCount: assignedTaskRecords.length,
        createdAt: deletedTaskStageRecord.createdAt.toISOString(),
        updatedAt: deletedTaskStageRecord.updatedAt.toISOString(),
      };
    });
  };
}
