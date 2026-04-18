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
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlTaskStageRecord = {
  id: string;
  name: string;
  isDefault: boolean;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

type DatabaseTransaction = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning(selection?: Record<string, unknown>): Promise<TaskStageRecord[]>;
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
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const databaseTransaction = tx as DatabaseTransaction;
      const now = new Date();
      const taskStageRecords = await databaseTransaction
        .insert(taskStages)
        .values({
          companyId,
          name: arguments_.input.name,
          isDefault: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: taskStages.id,
          isDefault: taskStages.isDefault,
          name: taskStages.name,
          createdAt: taskStages.createdAt,
          updatedAt: taskStages.updatedAt,
        });
      const [taskStageRecord] = taskStageRecords;
      if (!taskStageRecord) {
        throw new Error("Failed to create task stage.");
      }

      return {
        id: taskStageRecord.id,
        isDefault: taskStageRecord.isDefault,
        name: taskStageRecord.name,
        taskCount: 0,
        createdAt: taskStageRecord.createdAt.toISOString(),
        updatedAt: taskStageRecord.updatedAt.toISOString(),
      };
    });
  };
}
