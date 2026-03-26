import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { taskCategories, tasks } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type TaskStatus = "draft" | "pending" | "in_progress" | "completed";

type SetTaskCategoryMutationArguments = {
  input: {
    taskId: string;
    taskCategoryId?: string | null;
  };
};

type TaskCategoryRecord = {
  id: string;
  name: string;
};

type TaskRecord = {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  taskCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlTaskRecord = {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  taskCategoryId: string | null;
  taskCategoryName: string | null;
  createdAt: string;
  updatedAt: string;
};

type DatabaseTransaction = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<TaskRecord[]>;
      };
    };
  };
};

/**
 * Moves one task between persisted kanban lanes by rewriting the optional category foreign key for
 * the authenticated company.
 */
@injectable()
export class SetTaskCategoryMutation extends Mutation<SetTaskCategoryMutationArguments, GraphqlTaskRecord> {
  protected resolve = async (
    arguments_: SetTaskCategoryMutationArguments,
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

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const databaseTransaction = tx as DatabaseTransaction;
      const taskCategoryRecord = await this.resolveTaskCategoryRecord(databaseTransaction, context, arguments_);
      const [taskRecord] = await databaseTransaction
        .update(tasks)
        .set({
          taskCategoryId: taskCategoryRecord?.id ?? null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tasks.companyId, context.authSession.company.id),
          eq(tasks.id, arguments_.input.taskId),
        ))
        .returning?.({
          id: tasks.id,
          name: tasks.name,
          description: tasks.description,
          status: tasks.status,
          taskCategoryId: tasks.taskCategoryId,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
        }) as Promise<TaskRecord[]>;
      if (!taskRecord) {
        throw new Error("Task not found.");
      }

      return {
        id: taskRecord.id,
        name: taskRecord.name,
        description: taskRecord.description,
        status: taskRecord.status,
        taskCategoryId: taskRecord.taskCategoryId,
        taskCategoryName: taskCategoryRecord?.name ?? null,
        createdAt: taskRecord.createdAt.toISOString(),
        updatedAt: taskRecord.updatedAt.toISOString(),
      };
    });
  };

  private async resolveTaskCategoryRecord(
    databaseTransaction: DatabaseTransaction,
    context: GraphqlRequestContext,
    arguments_: SetTaskCategoryMutationArguments,
  ): Promise<TaskCategoryRecord | null> {
    if (!arguments_.input.taskCategoryId) {
      return null;
    }

    const [taskCategoryRecord] = await databaseTransaction
      .select({
        id: taskCategories.id,
        name: taskCategories.name,
      })
      .from(taskCategories)
      .where(and(
        eq(taskCategories.companyId, context.authSession!.company!.id),
        eq(taskCategories.id, arguments_.input.taskCategoryId),
      )) as TaskCategoryRecord[];
    if (!taskCategoryRecord) {
      throw new Error("Task category not found.");
    }

    return taskCategoryRecord;
  }
}
