import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { taskCategories, tasks } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteTaskCategoryMutationArguments = {
  input: {
    id: string;
  };
};

type TaskCategoryRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type TaskCategoryTaskRecord = {
  id: string;
};

type GraphqlTaskCategoryRecord = {
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
 * Deletes one persisted kanban category for the authenticated company. Tasks keep their records and
 * fall back to the uncategorized column because the task foreign key is defined with `onDelete: set null`.
 */
@injectable()
export class DeleteTaskCategoryMutation extends Mutation<
  DeleteTaskCategoryMutationArguments,
  GraphqlTaskCategoryRecord
> {
  protected resolve = async (
    arguments_: DeleteTaskCategoryMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlTaskCategoryRecord> => {
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
          eq(tasks.taskCategoryId, arguments_.input.id),
        )) as TaskCategoryTaskRecord[];
      const [deletedTaskCategoryRecord] = await deletableDatabase
        .delete(taskCategories)
        .where(and(
          eq(taskCategories.companyId, context.authSession.company.id),
          eq(taskCategories.id, arguments_.input.id),
        ))
        .returning?.({
          id: taskCategories.id,
          name: taskCategories.name,
          createdAt: taskCategories.createdAt,
          updatedAt: taskCategories.updatedAt,
        }) as TaskCategoryRecord[];
      if (!deletedTaskCategoryRecord) {
        throw new Error("Task category not found.");
      }

      return {
        id: deletedTaskCategoryRecord.id,
        name: deletedTaskCategoryRecord.name,
        taskCount: assignedTaskRecords.length,
        createdAt: deletedTaskCategoryRecord.createdAt.toISOString(),
        updatedAt: deletedTaskCategoryRecord.updatedAt.toISOString(),
      };
    });
  };
}
