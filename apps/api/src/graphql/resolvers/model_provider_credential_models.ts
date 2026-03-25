import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { modelProviderCredentialModels } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type ModelProviderCredentialModelsArguments = {
  modelProviderCredentialId: string;
};

type ModelProviderCredentialModelRecord = {
  id: string;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  reasoningLevels: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlModelProviderCredentialModelRecord = {
  id: string;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  reasoningLevels: string[];
  createdAt: string;
  updatedAt: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<ModelProviderCredentialModelRecord[]>;
    };
  };
};

/**
 * Lists model metadata for a single provider credential.
 */
@injectable()
export class ModelProviderCredentialModelsQueryResolver {
  execute = async (
    _root: unknown,
    arguments_: ModelProviderCredentialModelsArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlModelProviderCredentialModelRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const credentialId = String(arguments_.modelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("modelProviderCredentialId is required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const models = await selectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          modelId: modelProviderCredentialModels.modelId,
          name: modelProviderCredentialModels.name,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
          createdAt: modelProviderCredentialModels.createdAt,
          updatedAt: modelProviderCredentialModels.updatedAt,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, context.authSession.company.id),
          eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
        ));

      return models.map((model) => ({
        ...model,
        reasoningLevels: model.reasoningLevels ?? [],
        createdAt: model.createdAt.toISOString(),
        updatedAt: model.updatedAt.toISOString(),
      }));
    });
  };
}
