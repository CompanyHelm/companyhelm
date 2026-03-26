import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { taskCategories, tasks } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type TaskStatus = "draft" | "pending" | "in_progress" | "completed";

type CreateTaskMutationArguments = {
  input: {
    name: string;
    description?: string | null;
    status?: string | null;
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
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<TaskRecord[]>;
    };
  };
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Creates one company-scoped task after validating the optional category reference and the
 * requested status value used by the kanban and settings surfaces.
 */
@injectable()
export class CreateTaskMutation extends Mutation<CreateTaskMutationArguments, GraphqlTaskRecord> {
  private static readonly supportedStatuses: TaskStatus[] = ["draft", "pending", "in_progress", "completed"];

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
    if (!/\S/.test(arguments_.input.name)) {
      throw new Error("name is required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const databaseTransaction = tx as DatabaseTransaction;
      const taskCategoryRecord = await this.resolveTaskCategoryRecord(databaseTransaction, context, arguments_);
      const status = this.resolveStatus(arguments_.input.status);
      const now = new Date();
      const [taskRecord] = await databaseTransaction
        .insert(tasks)
        .values({
          companyId: context.authSession.company.id,
          taskCategoryId: taskCategoryRecord?.id ?? null,
          name: arguments_.input.name,
          description: arguments_.input.description ?? null,
          status,
          createdAt: now,
          updatedAt: now,
        })
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
        throw new Error("Failed to create task.");
      }

      return CreateTaskMutation.serializeRecord(taskRecord, taskCategoryRecord);
    });
  };

  private async resolveTaskCategoryRecord(
    databaseTransaction: DatabaseTransaction,
    context: GraphqlRequestContext,
    arguments_: CreateTaskMutationArguments,
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

  private resolveStatus(status: string | null | undefined): TaskStatus {
    if (status === undefined || status === null || status === "") {
      return "draft";
    }
    if (!CreateTaskMutation.supportedStatuses.includes(status as TaskStatus)) {
      throw new Error("Unsupported task status.");
    }

    return status as TaskStatus;
  }

  private static serializeRecord(
    taskRecord: TaskRecord,
    taskCategoryRecord: TaskCategoryRecord | null,
  ): GraphqlTaskRecord {
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
  }
}
