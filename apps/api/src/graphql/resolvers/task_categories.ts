import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { taskCategories, tasks } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type TaskCategoryRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type TaskCategoryTaskRecord = {
  taskCategoryId: string | null;
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

/**
 * Lists persisted kanban categories together with lightweight task counts so the settings screen
 * can show lane occupancy without loading the full task payload.
 */
@injectable()
export class TaskCategoriesQueryResolver extends Resolver<GraphqlTaskCategoryRecord[]> {
  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlTaskCategoryRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const taskCategoryRecords = await selectableDatabase
        .select({
          id: taskCategories.id,
          name: taskCategories.name,
          createdAt: taskCategories.createdAt,
          updatedAt: taskCategories.updatedAt,
        })
        .from(taskCategories)
        .where(eq(taskCategories.companyId, context.authSession.company.id)) as TaskCategoryRecord[];
      const taskRecords = await selectableDatabase
        .select({
          taskCategoryId: tasks.taskCategoryId,
        })
        .from(tasks)
        .where(eq(tasks.companyId, context.authSession.company.id)) as TaskCategoryTaskRecord[];
      const taskCountByCategoryId = new Map<string, number>();

      for (const taskRecord of taskRecords) {
        if (!taskRecord.taskCategoryId) {
          continue;
        }

        const currentCount = taskCountByCategoryId.get(taskRecord.taskCategoryId) ?? 0;
        taskCountByCategoryId.set(taskRecord.taskCategoryId, currentCount + 1);
      }

      return [...taskCategoryRecords]
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((taskCategoryRecord) => {
          return {
            id: taskCategoryRecord.id,
            name: taskCategoryRecord.name,
            taskCount: taskCountByCategoryId.get(taskCategoryRecord.id) ?? 0,
            createdAt: taskCategoryRecord.createdAt.toISOString(),
            updatedAt: taskCategoryRecord.updatedAt.toISOString(),
          };
        });
    });
  };
}
