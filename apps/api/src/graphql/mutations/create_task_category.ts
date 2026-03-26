import { injectable } from "inversify";
import { taskCategories } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateTaskCategoryMutationArguments = {
  input: {
    name: string;
  };
};

type TaskCategoryRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlTaskCategoryRecord = {
  id: string;
  name: string;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

type DatabaseTransaction = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<TaskCategoryRecord[]>;
    };
  };
};

/**
 * Persists one new kanban category for the authenticated company so the board and settings page
 * can share a single source of truth for available lanes.
 */
@injectable()
export class CreateTaskCategoryMutation extends Mutation<
  CreateTaskCategoryMutationArguments,
  GraphqlTaskCategoryRecord
> {
  protected resolve = async (
    arguments_: CreateTaskCategoryMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlTaskCategoryRecord> => {
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
      const [taskCategoryRecord] = await databaseTransaction
        .insert(taskCategories)
        .values({
          companyId: context.authSession.company.id,
          name: arguments_.input.name,
          createdAt: now,
          updatedAt: now,
        })
        .returning?.({
          id: taskCategories.id,
          name: taskCategories.name,
          createdAt: taskCategories.createdAt,
          updatedAt: taskCategories.updatedAt,
        }) as Promise<TaskCategoryRecord[]>;
      if (!taskCategoryRecord) {
        throw new Error("Failed to create task category.");
      }

      return {
        id: taskCategoryRecord.id,
        name: taskCategoryRecord.name,
        taskCount: 0,
        createdAt: taskCategoryRecord.createdAt.toISOString(),
        updatedAt: taskCategoryRecord.updatedAt.toISOString(),
      };
    });
  };
}
