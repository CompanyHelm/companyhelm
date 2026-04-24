import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { imageProviderCredentialModels } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { ImageGenerationProviderModel } from "./model.ts";
import { ImageGenerationModelRegistry } from "./model_registry.ts";
import { OpenAiCodexImageGenerationModelAdapter } from "./openai_codex_model_adapter.ts";
import { OpenAiImageGenerationModelAdapter } from "./openai_model_adapter.ts";
import type {
  ImageGenerationModelAdapterFetchOptions,
  ImageGenerationModelAdapterInterface,
} from "./model_adapter_interface.ts";

type StoredImageModelRecord = {
  createdAt: Date;
  description: string;
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  name: string;
  outputMimeTypes: string[];
  supportedQualities: string[];
  supportedSizes: string[];
  supportsEditing: boolean;
  supportsFlexibleSizes: boolean;
  supportsTransparentBackground: boolean;
  updatedAt: Date;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<StoredImageModelRecord[]>;
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
 * Owns provider-backed image-generation model discovery and persistence. It mirrors the main model
 * refresh flow, but stores image-specific capability metadata in a dedicated table.
 */
@injectable()
export class ImageGenerationModelService {
  private readonly modelRegistry: ImageGenerationModelRegistry;
  private readonly providerAdapters: Map<string, ImageGenerationModelAdapterInterface>;

  constructor(
    @inject(ImageGenerationModelRegistry)
    modelRegistry: ImageGenerationModelRegistry = new ImageGenerationModelRegistry(),
  ) {
    this.modelRegistry = modelRegistry;
    this.providerAdapters = new Map<string, ImageGenerationModelAdapterInterface>([
      ["openai", new OpenAiImageGenerationModelAdapter(modelRegistry)],
      ["openai-codex", new OpenAiCodexImageGenerationModelAdapter(modelRegistry)],
    ]);
  }

  async fetchModels(
    modelProvider: string,
    apiKey: string,
    options: ImageGenerationModelAdapterFetchOptions = {},
  ): Promise<ImageGenerationProviderModel[]> {
    const normalizedProvider = String(modelProvider || "").trim();
    if (!normalizedProvider) {
      throw new Error("Model provider is required.");
    }

    const adapter = this.providerAdapters.get(normalizedProvider);
    if (!adapter) {
      return [];
    }

    return adapter.fetchModels(apiKey, options);
  }

  async refreshStoredModels(input: {
    apiKey: string;
    baseUrl?: string | null;
    companyId: string;
    modelProvider: string;
    modelProviderCredentialId: string;
    transactionProvider: TransactionProviderInterface;
  }): Promise<StoredImageModelRecord[]> {
    const fetchedModels = await this.fetchModels(input.modelProvider, input.apiKey, {
      baseUrl: input.baseUrl,
    });

    return input.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const insertableDatabase = tx as unknown as InsertableDatabase;
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      const deletableDatabase = tx as unknown as DeletableDatabase;
      const existingModels = await selectableDatabase
        .select({
          createdAt: imageProviderCredentialModels.createdAt,
          description: imageProviderCredentialModels.description,
          id: imageProviderCredentialModels.id,
          isDefault: imageProviderCredentialModels.isDefault,
          modelId: imageProviderCredentialModels.modelId,
          modelProviderCredentialId: imageProviderCredentialModels.modelProviderCredentialId,
          name: imageProviderCredentialModels.name,
          outputMimeTypes: imageProviderCredentialModels.outputMimeTypes,
          supportedQualities: imageProviderCredentialModels.supportedQualities,
          supportedSizes: imageProviderCredentialModels.supportedSizes,
          supportsEditing: imageProviderCredentialModels.supportsEditing,
          supportsFlexibleSizes: imageProviderCredentialModels.supportsFlexibleSizes,
          supportsTransparentBackground: imageProviderCredentialModels.supportsTransparentBackground,
          updatedAt: imageProviderCredentialModels.updatedAt,
        })
        .from(imageProviderCredentialModels)
        .where(and(
          eq(imageProviderCredentialModels.companyId, input.companyId),
          eq(imageProviderCredentialModels.modelProviderCredentialId, input.modelProviderCredentialId),
        ));

      const existingModelsByModelId = new Map(existingModels.map((model) => [model.modelId, model]));
      const existingDefaultModelId = existingModels.find((model) => model.isDefault)?.modelId ?? null;
      const fetchedModelIds = new Set(fetchedModels.map((model) => model.modelId));
      const providerDefaultModelId = this.resolveDefaultModelId(
        input.modelProvider,
        fetchedModels.map((model) => model.modelId),
        existingDefaultModelId,
      );
      const now = new Date();

      for (const fetchedModel of fetchedModels) {
        const existingModel = existingModelsByModelId.get(fetchedModel.modelId);
        if (!existingModel) {
          await insertableDatabase.insert(imageProviderCredentialModels).values({
            companyId: input.companyId,
            createdAt: now,
            description: fetchedModel.description,
            isDefault: false,
            modelId: fetchedModel.modelId,
            modelProviderCredentialId: input.modelProviderCredentialId,
            name: fetchedModel.name,
            outputMimeTypes: fetchedModel.outputMimeTypes,
            supportedQualities: fetchedModel.supportedQualities,
            supportedSizes: fetchedModel.supportedSizes,
            supportsEditing: fetchedModel.supportsEditing,
            supportsFlexibleSizes: fetchedModel.supportsFlexibleSizes,
            supportsTransparentBackground: fetchedModel.supportsTransparentBackground,
            updatedAt: now,
          });
          continue;
        }

        await updatableDatabase.update(imageProviderCredentialModels).set({
          description: fetchedModel.description,
          name: fetchedModel.name,
          outputMimeTypes: fetchedModel.outputMimeTypes,
          supportedQualities: fetchedModel.supportedQualities,
          supportedSizes: fetchedModel.supportedSizes,
          supportsEditing: fetchedModel.supportsEditing,
          supportsFlexibleSizes: fetchedModel.supportsFlexibleSizes,
          supportsTransparentBackground: fetchedModel.supportsTransparentBackground,
          updatedAt: now,
        }).where(and(
          eq(imageProviderCredentialModels.companyId, input.companyId),
          eq(imageProviderCredentialModels.id, existingModel.id),
        ));
      }

      for (const existingModel of existingModels) {
        if (fetchedModelIds.has(existingModel.modelId)) {
          continue;
        }

        await deletableDatabase.delete(imageProviderCredentialModels).where(and(
          eq(imageProviderCredentialModels.companyId, input.companyId),
          eq(imageProviderCredentialModels.id, existingModel.id),
        ));
      }

      await updatableDatabase.update(imageProviderCredentialModels).set({ isDefault: false }).where(and(
        eq(imageProviderCredentialModels.companyId, input.companyId),
        eq(imageProviderCredentialModels.modelProviderCredentialId, input.modelProviderCredentialId),
      ));
      if (providerDefaultModelId) {
        await updatableDatabase.update(imageProviderCredentialModels).set({ isDefault: true }).where(and(
          eq(imageProviderCredentialModels.companyId, input.companyId),
          eq(imageProviderCredentialModels.modelProviderCredentialId, input.modelProviderCredentialId),
          eq(imageProviderCredentialModels.modelId, providerDefaultModelId),
        ));
      }

      return selectableDatabase
        .select({
          createdAt: imageProviderCredentialModels.createdAt,
          description: imageProviderCredentialModels.description,
          id: imageProviderCredentialModels.id,
          isDefault: imageProviderCredentialModels.isDefault,
          modelId: imageProviderCredentialModels.modelId,
          modelProviderCredentialId: imageProviderCredentialModels.modelProviderCredentialId,
          name: imageProviderCredentialModels.name,
          outputMimeTypes: imageProviderCredentialModels.outputMimeTypes,
          supportedQualities: imageProviderCredentialModels.supportedQualities,
          supportedSizes: imageProviderCredentialModels.supportedSizes,
          supportsEditing: imageProviderCredentialModels.supportsEditing,
          supportsFlexibleSizes: imageProviderCredentialModels.supportsFlexibleSizes,
          supportsTransparentBackground: imageProviderCredentialModels.supportsTransparentBackground,
          updatedAt: imageProviderCredentialModels.updatedAt,
        })
        .from(imageProviderCredentialModels)
        .where(and(
          eq(imageProviderCredentialModels.companyId, input.companyId),
          eq(imageProviderCredentialModels.modelProviderCredentialId, input.modelProviderCredentialId),
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
