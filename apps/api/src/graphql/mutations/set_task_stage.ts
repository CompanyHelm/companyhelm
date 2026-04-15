import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { taskStages, tasks } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type TaskStatus = "draft" | "pending" | "in_progress" | "completed";

type SetTaskStageMutationArguments = {
  input: {
    taskId: string;
    taskStageId?: string | null;
  };
};

type TaskStageRecord = {
  id: string;
  name: string;
};

type TaskRecord = {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  taskStageId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlTaskRecord = {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  taskStageId: string | null;
  taskStageName: string | null;
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
 * Moves one task between persisted kanban lanes by rewriting the optional stage foreign key for
 * the authenticated company.
 */
@injectable()
export class SetTaskStageMutation extends Mutation<SetTaskStageMutationArguments, GraphqlTaskRecord> {
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

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const databaseTransaction = tx as DatabaseTransaction;
      const taskStageRecord = await this.resolveTaskStageRecord(databaseTransaction, context, arguments_);
      const [taskRecord] = await databaseTransaction
        .update(tasks)
        .set({
          taskStageId: taskStageRecord?.id ?? null,
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
          taskStageId: tasks.taskStageId,
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
        taskStageId: taskRecord.taskStageId,
        taskStageName: taskStageRecord?.name ?? null,
        createdAt: taskRecord.createdAt.toISOString(),
        updatedAt: taskRecord.updatedAt.toISOString(),
      };
    });
  };

  private async resolveTaskStageRecord(
    databaseTransaction: DatabaseTransaction,
    context: GraphqlRequestContext,
    arguments_: SetTaskStageMutationArguments,
  ): Promise<TaskStageRecord | null> {
    if (!arguments_.input.taskStageId) {
      return null;
    }

    const [taskStageRecord] = await databaseTransaction
      .select({
        id: taskStages.id,
        name: taskStages.name,
      })
      .from(taskStages)
      .where(and(
        eq(taskStages.companyId, context.authSession!.company!.id),
        eq(taskStages.id, arguments_.input.taskStageId),
      )) as TaskStageRecord[];
    if (!taskStageRecord) {
      throw new Error("Task stage not found.");
    }

    return taskStageRecord;
  }
}
