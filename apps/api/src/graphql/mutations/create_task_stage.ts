import { injectable } from "inversify";
import { taskStages } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateTaskStageMutationArguments = {
  input: {
    name: string;
  };
};

type TaskStageRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlTaskStageRecord = {
  id: string;
  name: string;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

type DatabaseTransaction = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<TaskStageRecord[]>;
    };
  };
};

/**
 * Persists one new kanban stage for the authenticated company so the board and settings page
 * can share a single source of truth for available lanes.
 */
@injectable()
export class CreateTaskStageMutation extends Mutation<
  CreateTaskStageMutationArguments,
  GraphqlTaskStageRecord
> {
  protected resolve = async (
    arguments_: CreateTaskStageMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlTaskStageRecord> => {
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
      const now = new Date();
      const [taskStageRecord] = await databaseTransaction
        .insert(taskStages)
        .values({
          companyId: context.authSession.company.id,
          name: arguments_.input.name,
          createdAt: now,
          updatedAt: now,
        })
        .returning?.({
          id: taskStages.id,
          name: taskStages.name,
          createdAt: taskStages.createdAt,
          updatedAt: taskStages.updatedAt,
        }) as Promise<TaskStageRecord[]>;
      if (!taskStageRecord) {
        throw new Error("Failed to create task stage.");
      }

      return {
        id: taskStageRecord.id,
        name: taskStageRecord.name,
        taskCount: 0,
        createdAt: taskStageRecord.createdAt.toISOString(),
        updatedAt: taskStageRecord.updatedAt.toISOString(),
      };
    });
  };
}
