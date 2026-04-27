import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { platformModelProviderCredentialModels } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { ModelRegistry } from "./model_registry.ts";
import type { ModelProviderModel } from "./model_provider_model.ts";
import { ModelService } from "./model_service.ts";

export type PlatformStoredModelRecord = {
  description: string;
  id: string;
  isDefault: boolean;
  modelId: string;
  name: string;
  platformModelProviderCredentialId: string;
  reasoningSupported: boolean;
  reasoningLevels: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<PlatformStoredModelRecord[]>;
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
 * Owns platform credential model discovery and reconciliation. It intentionally mirrors the
 * company credential model refresh behavior while writing to platform-only tables so operator
 * credentials never share persistence paths with company-owned credentials.
 */
@injectable()
export class PlatformModelProviderCredentialService {
  private readonly modelRegistry: ModelRegistry;
  private readonly modelService: ModelService;

  constructor(
    @inject(ModelRegistry) modelRegistry: ModelRegistry,
    @inject(ModelService) modelService: ModelService,
  ) {
    this.modelRegistry = modelRegistry;
    this.modelService = modelService;
  }

  async fetchModels(input: {
    apiKey: string;
    baseUrl?: string | null;
    modelProvider: string;
  }): Promise<ModelProviderModel[]> {
    return this.modelService.fetchModels(input.modelProvider, input.apiKey, {
      baseUrl: input.baseUrl,
    });
  }

  async refreshStoredModels(input: {
    apiKey: string;
    baseUrl?: string | null;
    modelProvider: string;
    platformModelProviderCredentialId: string;
    transactionProvider: TransactionProviderInterface;
  }): Promise<PlatformStoredModelRecord[]> {
    const fetchedModels = await this.fetchModels(input);
    const now = new Date();

    return input.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const insertableDatabase = tx as unknown as InsertableDatabase;
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      const deletableDatabase = tx as unknown as DeletableDatabase;
      const existingModels = await this.loadStoredModels(selectableDatabase, input.platformModelProviderCredentialId);
      const existingModelsByModelId = new Map(existingModels.map((model) => [model.modelId, model]));
      const existingDefaultModelId = existingModels.find((model) => model.isDefault)?.modelId ?? null;
      const fetchedModelIds = new Set(fetchedModels.map((model) => model.modelId));
      const providerDefaultModelId = this.resolvePreferredDefaultModelId(
        input.modelProvider,
        fetchedModels.map((model) => model.modelId),
        existingDefaultModelId,
      );

      for (const fetchedModel of fetchedModels) {
        const existingModel = existingModelsByModelId.get(fetchedModel.modelId);
        if (!existingModel) {
          await insertableDatabase
            .insert(platformModelProviderCredentialModels)
            .values(this.toModelInsertInput({
              model: fetchedModel,
              now,
              platformModelProviderCredentialId: input.platformModelProviderCredentialId,
            }));
          continue;
        }

        await updatableDatabase
          .update(platformModelProviderCredentialModels)
          .set({
            name: fetchedModel.name,
            description: fetchedModel.description,
            reasoningSupported: fetchedModel.reasoningSupported,
            reasoningLevels: fetchedModel.reasoningLevels,
            updatedAt: now,
          })
          .where(and(
            eq(platformModelProviderCredentialModels.id, existingModel.id),
            eq(
              platformModelProviderCredentialModels.platformModelProviderCredentialId,
              input.platformModelProviderCredentialId,
            ),
          ));
      }

      for (const existingModel of existingModels) {
        if (fetchedModelIds.has(existingModel.modelId)) {
          continue;
        }

        await deletableDatabase
          .delete(platformModelProviderCredentialModels)
          .where(and(
            eq(platformModelProviderCredentialModels.id, existingModel.id),
            eq(
              platformModelProviderCredentialModels.platformModelProviderCredentialId,
              input.platformModelProviderCredentialId,
            ),
          ));
      }

      await updatableDatabase
        .update(platformModelProviderCredentialModels)
        .set({
          isDefault: false,
          updatedAt: now,
        })
        .where(eq(
          platformModelProviderCredentialModels.platformModelProviderCredentialId,
          input.platformModelProviderCredentialId,
        ));
      if (providerDefaultModelId) {
        await updatableDatabase
          .update(platformModelProviderCredentialModels)
          .set({
            isDefault: true,
            updatedAt: now,
          })
          .where(and(
            eq(
              platformModelProviderCredentialModels.platformModelProviderCredentialId,
              input.platformModelProviderCredentialId,
            ),
            eq(platformModelProviderCredentialModels.modelId, providerDefaultModelId),
          ));
      }

      return this.loadStoredModels(selectableDatabase, input.platformModelProviderCredentialId);
    });
  }

  resolveDefaultModelId(input: {
    existingDefaultModelId?: string | null;
    modelIds: string[];
    modelProvider: string;
  }): string | null {
    if (input.existingDefaultModelId && input.modelIds.includes(input.existingDefaultModelId)) {
      return input.existingDefaultModelId;
    }

    return this.resolvePreferredDefaultModelId(input.modelProvider, input.modelIds, null);
  }

  toModelInsertInput(input: {
    model: ModelProviderModel;
    now: Date;
    platformModelProviderCredentialId: string;
  }): Record<string, unknown> {
    return {
      platformModelProviderCredentialId: input.platformModelProviderCredentialId,
      modelId: input.model.modelId,
      name: input.model.name,
      description: input.model.description,
      reasoningSupported: input.model.reasoningSupported,
      reasoningLevels: input.model.reasoningLevels,
      isDefault: false,
      createdAt: input.now,
      updatedAt: input.now,
    };
  }

  private async loadStoredModels(
    database: SelectableDatabase,
    platformModelProviderCredentialId: string,
  ): Promise<PlatformStoredModelRecord[]> {
    return database
      .select({
        description: platformModelProviderCredentialModels.description,
        id: platformModelProviderCredentialModels.id,
        isDefault: platformModelProviderCredentialModels.isDefault,
        modelId: platformModelProviderCredentialModels.modelId,
        name: platformModelProviderCredentialModels.name,
        platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
        reasoningSupported: platformModelProviderCredentialModels.reasoningSupported,
        reasoningLevels: platformModelProviderCredentialModels.reasoningLevels,
        createdAt: platformModelProviderCredentialModels.createdAt,
        updatedAt: platformModelProviderCredentialModels.updatedAt,
      })
      .from(platformModelProviderCredentialModels)
      .where(eq(
        platformModelProviderCredentialModels.platformModelProviderCredentialId,
        platformModelProviderCredentialId,
      ));
  }

  private resolvePreferredDefaultModelId(
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
