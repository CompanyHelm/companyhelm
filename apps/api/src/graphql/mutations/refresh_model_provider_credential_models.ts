import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { ModelService, type ModelProviderModel } from "../../services/ai_providers/model_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type RefreshModelProviderCredentialModelsMutationArguments = {
  input: {
    modelProviderCredentialId: string;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  modelProvider: "openai" | "anthropic";
  encryptedApiKey: string;
};

type ModelProviderCredentialModelRecord = {
  id: string;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  description: string;
  reasoningLevels: string[] | null;
};

type GraphqlModelProviderCredentialModelRecord = {
  id: string;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  description: string;
  reasoningLevels: string[];
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<ModelProviderCredentialRecord[]>;
      };
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): Promise<void>;
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<void>;
  };
};

type ModelsSelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<ModelProviderCredentialModelRecord[]>;
    };
  };
};

/**
 * Refreshes the stored model list for a provider credential.
 */
@injectable()
export class RefreshModelProviderCredentialModelsMutation extends Mutation<
  RefreshModelProviderCredentialModelsMutationArguments,
  GraphqlModelProviderCredentialModelRecord[]
> {
  private readonly modelService: ModelService;

  constructor(@inject(ModelService) modelService: ModelService) {
    super();
    this.modelService = modelService;
  }

  protected resolve = async (
    arguments_: RefreshModelProviderCredentialModelsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlModelProviderCredentialModelRecord[]> => {
    const credentialId = String(arguments_.input.modelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("modelProviderCredentialId is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const [credential] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          modelProvider: modelProviderCredentials.modelProvider,
          encryptedApiKey: modelProviderCredentials.encryptedApiKey,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, context.authSession.company.id),
          eq(modelProviderCredentials.id, credentialId),
        ))
        .limit(1);
    });

    if (!credential) {
      throw new Error("Credential not found.");
    }

    const models = await this.modelService.fetchModels(credential.modelProvider, credential.encryptedApiKey);
    const updatedModels = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const modelsSelectableDatabase = tx as ModelsSelectableDatabase;
      await deletableDatabase
        .delete(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, context.authSession.company.id),
          eq(modelProviderCredentialModels.modelProviderCredentialId, credential.id),
        ));

      if (models.length > 0) {
        await insertableDatabase
          .insert(modelProviderCredentialModels)
          .values(models.map((model) => RefreshModelProviderCredentialModelsMutation.toModelInsertInput({
            model,
            companyId: context.authSession.company.id,
            modelProviderCredentialId: credential.id,
          })));
      }

      return modelsSelectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          modelId: modelProviderCredentialModels.modelId,
          name: modelProviderCredentialModels.name,
          description: modelProviderCredentialModels.description,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, context.authSession.company.id),
          eq(modelProviderCredentialModels.modelProviderCredentialId, credential.id),
        ));
    });

    return updatedModels.map((model) => ({
      ...model,
      reasoningLevels: model.reasoningLevels ?? [],
    }));
  };

  private static toModelInsertInput(input: {
    model: ModelProviderModel;
    companyId: string;
    modelProviderCredentialId: string;
  }): Record<string, unknown> {
    return {
      companyId: input.companyId,
      modelProviderCredentialId: input.modelProviderCredentialId,
      modelId: input.model.modelId,
      name: input.model.name,
      description: input.model.description,
      reasoningLevels: input.model.reasoningLevels,
    };
  }
}
