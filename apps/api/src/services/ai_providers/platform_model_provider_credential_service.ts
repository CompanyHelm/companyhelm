import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { platformModelProviderCredentialModels, platformModelRoutes, platformModels } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { ModelRegistry } from "./model_registry.ts";
import type { ModelProviderModel } from "./model_provider_model.ts";
import { ModelService } from "./model_service.ts";

export type PlatformStoredModelRecord = {
  description: string;
  id: string;
  isAvailable: boolean;
  isDefault: boolean;
  modelId: string;
  name: string;
  platformModelProviderCredentialId: string;
  reasoningSupported: boolean;
  reasoningLevels: string[] | null;
  createdAt: Date;
  unavailableAt: Date | null;
  updatedAt: Date;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
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
            isAvailable: true,
            reasoningSupported: fetchedModel.reasoningSupported,
            reasoningLevels: fetchedModel.reasoningLevels,
            unavailableAt: null,
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

        await updatableDatabase
          .update(platformModelProviderCredentialModels)
          .set({
            isAvailable: false,
            unavailableAt: now,
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

      const refreshedModels = await this.loadStoredModels(selectableDatabase, input.platformModelProviderCredentialId);
      await this.reconcilePlatformModelsAndRoutes({
        insertableDatabase,
        modelProvider: input.modelProvider,
        now,
        selectableDatabase,
        storedModels: refreshedModels,
        updatableDatabase,
      });

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
      isAvailable: true,
      unavailableAt: null,
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
        isAvailable: platformModelProviderCredentialModels.isAvailable,
        isDefault: platformModelProviderCredentialModels.isDefault,
        modelId: platformModelProviderCredentialModels.modelId,
        name: platformModelProviderCredentialModels.name,
        platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
        reasoningSupported: platformModelProviderCredentialModels.reasoningSupported,
        reasoningLevels: platformModelProviderCredentialModels.reasoningLevels,
        createdAt: platformModelProviderCredentialModels.createdAt,
        unavailableAt: platformModelProviderCredentialModels.unavailableAt,
        updatedAt: platformModelProviderCredentialModels.updatedAt,
      })
      .from(platformModelProviderCredentialModels)
      .where(eq(
        platformModelProviderCredentialModels.platformModelProviderCredentialId,
        platformModelProviderCredentialId,
      )) as Promise<PlatformStoredModelRecord[]>;
  }

  private async reconcilePlatformModelsAndRoutes(input: {
    insertableDatabase: InsertableDatabase;
    modelProvider: string;
    now: Date;
    selectableDatabase: SelectableDatabase;
    storedModels: PlatformStoredModelRecord[];
    updatableDatabase: UpdatableDatabase;
  }): Promise<void> {
    for (const storedModel of input.storedModels) {
      if (!storedModel.isAvailable) {
        continue;
      }

      const key = `${input.modelProvider}:${storedModel.modelId}`;
      const [existingPlatformModel] = await input.selectableDatabase
        .select({
          id: platformModels.id,
        })
        .from(platformModels)
        .where(eq(platformModels.key, key)) as Array<{ id: string }>;
      const platformModelId = existingPlatformModel?.id;
      if (platformModelId) {
        await input.updatableDatabase
          .update(platformModels)
          .set({
            description: storedModel.description,
            isAvailable: true,
            isDefault: false,
            modelProvider: input.modelProvider,
            name: storedModel.name,
            reasoningSupported: storedModel.reasoningSupported,
            reasoningLevels: storedModel.reasoningLevels,
            updatedAt: input.now,
          })
          .where(eq(platformModels.id, platformModelId));
        await this.ensurePlatformModelRoute(input, platformModelId, storedModel.id);
        continue;
      }

      await input.insertableDatabase
        .insert(platformModels)
        .values({
          createdAt: input.now,
          description: storedModel.description,
          isAvailable: true,
          isDefault: false,
          key,
          modelId: storedModel.modelId,
          modelProvider: input.modelProvider,
          name: storedModel.name,
          reasoningSupported: storedModel.reasoningSupported,
          reasoningLevels: storedModel.reasoningLevels,
          updatedAt: input.now,
        });
      const [createdPlatformModel] = await input.selectableDatabase
        .select({
          id: platformModels.id,
        })
        .from(platformModels)
        .where(eq(platformModels.key, key)) as Array<{ id: string }>;
      if (createdPlatformModel) {
        await this.ensurePlatformModelRoute(input, createdPlatformModel.id, storedModel.id);
      }
    }
  }

  private async ensurePlatformModelRoute(
    input: {
      insertableDatabase: InsertableDatabase;
      now: Date;
      selectableDatabase: SelectableDatabase;
    },
    platformModelId: string,
    platformModelProviderCredentialModelId: string,
  ): Promise<void> {
    const [existingRoute] = await input.selectableDatabase
      .select({
        id: platformModelRoutes.id,
      })
      .from(platformModelRoutes)
      .where(and(
        eq(platformModelRoutes.platformModelId, platformModelId),
        eq(platformModelRoutes.platformModelProviderCredentialModelId, platformModelProviderCredentialModelId),
      )) as Array<{ id: string }>;
    if (existingRoute) {
      return;
    }

    await input.insertableDatabase
      .insert(platformModelRoutes)
      .values({
        createdAt: input.now,
        platformModelId,
        platformModelProviderCredentialModelId,
        updatedAt: input.now,
      });
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
