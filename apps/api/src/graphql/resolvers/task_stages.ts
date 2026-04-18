import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { taskStages, tasks } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type TaskStageRecord = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TaskStageTaskRecord = {
  taskStageId: string;
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

/**
 * Lists persisted kanban stages together with lightweight task counts so the settings screen
 * can show lane occupancy without loading the full task payload.
 */
@injectable()
export class TaskStagesQueryResolver extends Resolver<GraphqlTaskStageRecord[]> {
  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlTaskStageRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const taskStageRecords = await selectableDatabase
        .select({
          id: taskStages.id,
          isDefault: taskStages.isDefault,
          name: taskStages.name,
          createdAt: taskStages.createdAt,
          updatedAt: taskStages.updatedAt,
        })
        .from(taskStages)
        .where(eq(taskStages.companyId, companyId)) as TaskStageRecord[];
      const taskRecords = await selectableDatabase
        .select({
          taskStageId: tasks.taskStageId,
        })
        .from(tasks)
        .where(eq(tasks.companyId, companyId)) as TaskStageTaskRecord[];
      const taskCountByStageId = new Map<string, number>();

      for (const taskRecord of taskRecords) {
        const currentCount = taskCountByStageId.get(taskRecord.taskStageId) ?? 0;
        taskCountByStageId.set(taskRecord.taskStageId, currentCount + 1);
      }

      return [...taskStageRecords]
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((taskStageRecord) => {
          return {
            id: taskStageRecord.id,
            isDefault: taskStageRecord.isDefault,
            name: taskStageRecord.name,
            taskCount: taskCountByStageId.get(taskStageRecord.id) ?? 0,
            createdAt: taskStageRecord.createdAt.toISOString(),
            updatedAt: taskStageRecord.updatedAt.toISOString(),
          };
        });
    });
  };
}
