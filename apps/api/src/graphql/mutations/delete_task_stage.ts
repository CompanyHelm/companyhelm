import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { taskStages, tasks } from "../../db/schema.ts";
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
  createdAt: Date;
  updatedAt: Date;
};

type TaskStageTaskRecord = {
  id: string;
};

type GraphqlTaskStageRecord = {
  id: string;
  name: string;
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

/**
 * Deletes one persisted kanban stage for the authenticated company. Tasks keep their records and
 * fall back to the no-stage column because the task foreign key is defined with `onDelete: set null`.
 */
@injectable()
export class DeleteTaskStageMutation extends Mutation<
  DeleteTaskStageMutationArguments,
  GraphqlTaskStageRecord
> {
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

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const assignedTaskRecords = await selectableDatabase
        .select({
          id: tasks.id,
        })
        .from(tasks)
        .where(and(
          eq(tasks.companyId, context.authSession.company.id),
          eq(tasks.taskStageId, arguments_.input.id),
        )) as TaskStageTaskRecord[];
      const [deletedTaskStageRecord] = await deletableDatabase
        .delete(taskStages)
        .where(and(
          eq(taskStages.companyId, context.authSession.company.id),
          eq(taskStages.id, arguments_.input.id),
        ))
        .returning?.({
          id: taskStages.id,
          name: taskStages.name,
          createdAt: taskStages.createdAt,
          updatedAt: taskStages.updatedAt,
        }) as TaskStageRecord[];
      if (!deletedTaskStageRecord) {
        throw new Error("Task stage not found.");
      }

      return {
        id: deletedTaskStageRecord.id,
        name: deletedTaskStageRecord.name,
        taskCount: assignedTaskRecords.length,
        createdAt: deletedTaskStageRecord.createdAt.toISOString(),
        updatedAt: deletedTaskStageRecord.updatedAt.toISOString(),
      };
    });
  };
}
