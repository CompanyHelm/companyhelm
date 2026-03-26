import { eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { taskCategories, tasks } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type TaskRecord = {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "pending" | "in_progress" | "completed";
  taskCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TaskCategoryRecord = {
  id: string;
  name: string;
};

type GraphqlTaskRecord = {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "pending" | "in_progress" | "completed";
  taskCategoryId: string | null;
  taskCategoryName: string | null;
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

/**
 * Lists company-scoped tasks together with the current category label so the kanban page can
 * render lanes without issuing one category lookup per task.
 */
@injectable()
export class TasksQueryResolver extends Resolver<GraphqlTaskRecord[]> {
  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlTaskRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const taskRecords = await selectableDatabase
        .select({
          id: tasks.id,
          name: tasks.name,
          description: tasks.description,
          status: tasks.status,
          taskCategoryId: tasks.taskCategoryId,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(eq(tasks.companyId, context.authSession.company.id)) as TaskRecord[];

      const taskCategoryIds = taskRecords
        .map((taskRecord) => taskRecord.taskCategoryId)
        .filter((value): value is string => value !== null);
      const taskCategoryRecords = taskCategoryIds.length === 0
        ? []
        : await selectableDatabase
          .select({
            id: taskCategories.id,
            name: taskCategories.name,
          })
          .from(taskCategories)
          .where(inArray(taskCategories.id, taskCategoryIds)) as TaskCategoryRecord[];
      const taskCategoryNameById = new Map(
        taskCategoryRecords.map((taskCategoryRecord) => [taskCategoryRecord.id, taskCategoryRecord.name]),
      );

      return [...taskRecords]
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((taskRecord) => TasksQueryResolver.serializeRecord(taskRecord, taskCategoryNameById));
    });
  };

  private static serializeRecord(
    taskRecord: TaskRecord,
    taskCategoryNameById: Map<string, string>,
  ): GraphqlTaskRecord {
    return {
      id: taskRecord.id,
      name: taskRecord.name,
      description: taskRecord.description,
      status: taskRecord.status,
      taskCategoryId: taskRecord.taskCategoryId,
      taskCategoryName: taskRecord.taskCategoryId
        ? taskCategoryNameById.get(taskRecord.taskCategoryId) ?? null
        : null,
      createdAt: taskRecord.createdAt.toISOString(),
      updatedAt: taskRecord.updatedAt.toISOString(),
    };
  }
}
