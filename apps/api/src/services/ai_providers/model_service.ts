import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentialModels } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { ModelRegistry } from "./model_registry.js";
import { ModelProviderModel } from "./model_provider_model.js";
import { AnthropicModelAdapter } from "../providers/models-adapters/anthropic_model_adapter.js";
import type { ModelAdapterInterface } from "../providers/models-adapters/model_adapter_interface.js";
import { OpenAiCodexModelAdapter } from "../providers/models-adapters/openai_codex_model_adapter.js";
import { OpenAiModelAdapter } from "../providers/models-adapters/openai_model_adapter.js";
import { OpenRouterModelAdapter } from "../providers/models-adapters/openrouter_model_adapter.js";

type StoredModelRecord = {
  id: string;
  isDefault: boolean;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  description: string;
  reasoningLevels: string[] | null;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<StoredModelRecord[]>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): Promise<void>;
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<void>;
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<void>;
  };
};

/**
 * Owns provider-backed model discovery and persistence. Its scope is selecting the right provider
 * adapter to fetch remote models, then reconciling those remote results with CompanyHelm's stored
 * credential-model rows so higher layers do not need to know how model refresh is performed.
 */
@injectable()
export class ModelService {
  private readonly modelRegistry: ModelRegistry;
  private readonly providerAdapters: Map<string, ModelAdapterInterface>;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry) {
    this.modelRegistry = modelRegistry;
    this.providerAdapters = new Map<string, ModelAdapterInterface>([
      ["openai", new OpenAiModelAdapter(modelRegistry)],
      ["openai-codex", new OpenAiCodexModelAdapter(modelRegistry)],
      ["anthropic", new AnthropicModelAdapter(modelRegistry)],
      ["openrouter", new OpenRouterModelAdapter()],
    ]);
  }

  async fetchModels(modelProvider: string, apiKey: string): Promise<ModelProviderModel[]> {
    const normalizedProvider = String(modelProvider || "").trim();
    if (!normalizedProvider) {
      throw new Error("Model provider is required.");
    }

    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    const adapter = this.providerAdapters.get(normalizedProvider);
    if (!adapter) {
      throw new Error(`Unsupported model provider: ${normalizedProvider}`);
    }

    return adapter.fetchModels(normalizedApiKey);
  }

  async refreshStoredModels(input: {
    apiKey: string;
    companyId: string;
    modelProvider: string;
    modelProviderCredentialId: string;
    transactionProvider: TransactionProviderInterface;
  }): Promise<StoredModelRecord[]> {
    const fetchedModels = await this.fetchModels(input.modelProvider, input.apiKey);

    return input.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const existingModels = await selectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          isDefault: modelProviderCredentialModels.isDefault,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          modelId: modelProviderCredentialModels.modelId,
          name: modelProviderCredentialModels.name,
          description: modelProviderCredentialModels.description,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, input.companyId),
          eq(modelProviderCredentialModels.modelProviderCredentialId, input.modelProviderCredentialId),
        ));

      const existingModelsByModelId = new Map(
        existingModels.map((model) => [model.modelId, model]),
      );
      const existingDefaultModelId = existingModels.find((model) => model.isDefault)?.modelId ?? null;
      const fetchedModelIds = new Set(fetchedModels.map((model) => model.modelId));
      const providerDefaultModelId = this.resolveDefaultModelId(
        input.modelProvider,
        fetchedModels.map((model) => model.modelId),
        existingDefaultModelId,
      );

      for (const fetchedModel of fetchedModels) {
        const existingModel = existingModelsByModelId.get(fetchedModel.modelId);
        if (!existingModel) {
          await insertableDatabase
            .insert(modelProviderCredentialModels)
            .values({
              companyId: input.companyId,
              modelProviderCredentialId: input.modelProviderCredentialId,
              modelId: fetchedModel.modelId,
              name: fetchedModel.name,
              description: fetchedModel.description,
              reasoningLevels: fetchedModel.reasoningLevels,
              isDefault: false,
            });
          continue;
        }

        await updatableDatabase
          .update(modelProviderCredentialModels)
          .set({
            name: fetchedModel.name,
            description: fetchedModel.description,
            reasoningLevels: fetchedModel.reasoningLevels,
          })
          .where(and(
            eq(modelProviderCredentialModels.companyId, input.companyId),
            eq(modelProviderCredentialModels.id, existingModel.id),
          ));
      }

      for (const existingModel of existingModels) {
        if (fetchedModelIds.has(existingModel.modelId)) {
          continue;
        }

        await deletableDatabase
          .delete(modelProviderCredentialModels)
          .where(and(
            eq(modelProviderCredentialModels.companyId, input.companyId),
            eq(modelProviderCredentialModels.id, existingModel.id),
          ));
      }

      await updatableDatabase
        .update(modelProviderCredentialModels)
        .set({
          isDefault: false,
        })
        .where(and(
          eq(modelProviderCredentialModels.companyId, input.companyId),
          eq(modelProviderCredentialModels.modelProviderCredentialId, input.modelProviderCredentialId),
        ));
      if (providerDefaultModelId) {
        await updatableDatabase
          .update(modelProviderCredentialModels)
          .set({
            isDefault: true,
          })
          .where(and(
            eq(modelProviderCredentialModels.companyId, input.companyId),
            eq(modelProviderCredentialModels.modelProviderCredentialId, input.modelProviderCredentialId),
            eq(modelProviderCredentialModels.modelId, providerDefaultModelId),
          ));
      }

      return selectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          isDefault: modelProviderCredentialModels.isDefault,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          modelId: modelProviderCredentialModels.modelId,
          name: modelProviderCredentialModels.name,
          description: modelProviderCredentialModels.description,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, input.companyId),
          eq(modelProviderCredentialModels.modelProviderCredentialId, input.modelProviderCredentialId),
        ));
    });
  }

  private resolveDefaultModelId(
    modelProvider: string,
    fetchedModelIds: string[],
    existingDefaultModelId: string | null,
  ): string | null {
    if (existingDefaultModelId && fetchedModelIds.includes(existingDefaultModelId)) {
      return existingDefaultModelId;
    }

    const providerDefaultModelId = this.modelRegistry.getDefaultModelForProvider(modelProvider);
    if (providerDefaultModelId && fetchedModelIds.includes(providerDefaultModelId)) {
      return providerDefaultModelId;
    }

    return fetchedModelIds[0] ?? null;
  }
}

export { ModelProviderModel } from "./model_provider_model.js";
