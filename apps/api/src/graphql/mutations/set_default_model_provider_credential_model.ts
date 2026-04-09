import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { modelProviderCredentialModels } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type SetDefaultModelProviderCredentialModelMutationArguments = {
  input: {
    id: string;
  };
};

type ModelProviderCredentialModelRecord = {
  description: string;
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  name: string;
  reasoningSupported: boolean;
  reasoningLevels: string[] | null;
};

type GraphqlModelProviderCredentialModelRecord = {
  description: string;
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  name: string;
  reasoningSupported: boolean;
  reasoningLevels: string[];
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<void>;
    };
  };
};

/**
 * Promotes one stored model row to be the default model within its credential.
 */
@injectable()
export class SetDefaultModelProviderCredentialModelMutation extends Mutation<
  SetDefaultModelProviderCredentialModelMutationArguments,
  GraphqlModelProviderCredentialModelRecord
> {
  protected resolve = async (
    arguments_: SetDefaultModelProviderCredentialModelMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlModelProviderCredentialModelRecord> => {
    const modelRowId = String(arguments_.input.id || "").trim();
    if (!modelRowId) {
      throw new Error("id is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const [model] = await selectableDatabase
        .select({
          description: modelProviderCredentialModels.description,
          id: modelProviderCredentialModels.id,
          isDefault: modelProviderCredentialModels.isDefault,
          modelId: modelProviderCredentialModels.modelId,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          name: modelProviderCredentialModels.name,
          reasoningSupported: modelProviderCredentialModels.reasoningSupported,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, context.authSession.company.id),
          eq(modelProviderCredentialModels.id, modelRowId),
        )) as ModelProviderCredentialModelRecord[];
      if (!model) {
        throw new Error("Credential model not found.");
      }

      await updatableDatabase
        .update(modelProviderCredentialModels)
        .set({
          isDefault: false,
        })
        .where(and(
          eq(modelProviderCredentialModels.companyId, context.authSession.company.id),
          eq(modelProviderCredentialModels.modelProviderCredentialId, model.modelProviderCredentialId),
        ));
      await updatableDatabase
        .update(modelProviderCredentialModels)
        .set({
          isDefault: true,
        })
        .where(and(
          eq(modelProviderCredentialModels.companyId, context.authSession.company.id),
          eq(modelProviderCredentialModels.id, model.id),
        ));

      return {
        ...model,
        isDefault: true,
        reasoningSupported: model.reasoningSupported,
        reasoningLevels: model.reasoningLevels ?? [],
      };
    });
  };
}
