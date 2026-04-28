import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import {
  platformModelProviderCredentialModels,
  platformModelProviderCredentials,
  platformModelRoutes,
  platformModels,
} from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type PlatformModelCatalogRecord = {
  createdAt: Date;
  description: string;
  id: string;
  isAvailable: boolean;
  isDefault: boolean;
  key: string;
  modelId: string;
  modelProvider: string;
  name: string;
  reasoningLevels: string[] | null;
  reasoningSupported: boolean;
  routeCount: number;
  updatedAt: Date;
};

type CredentialModelRecord = {
  description: string;
  id: string;
  isAvailable: boolean;
  modelId: string;
  name: string;
  platformModelProviderCredentialId: string;
  reasoningLevels: string[] | null;
  reasoningSupported: boolean;
};

type CredentialRecord = {
  id: string;
  modelProvider: string;
  status: string;
};

type DatabaseTransaction = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
  execute?(query: unknown): Promise<unknown>;
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

/**
 * Owns the admin-managed platform model catalog. Provider credential refresh only discovers
 * concrete models; this service is the explicit boundary that publishes product-facing models and
 * connects them to concrete credential-model routes.
 */
@injectable()
export class PlatformModelCatalogService {
  async createManualModel(input: {
    description?: string | null;
    isDefault?: boolean | null;
    modelId: string;
    modelProvider: string;
    name?: string | null;
    reasoningLevels?: string[] | null;
    reasoningSupported?: boolean | null;
    transactionProvider: TransactionProviderInterface;
  }): Promise<PlatformModelCatalogRecord> {
    const modelProvider = PlatformModelCatalogService.requireTrimmed(input.modelProvider, "modelProvider");
    const modelId = PlatformModelCatalogService.requireTrimmed(input.modelId, "modelId");
    const now = new Date();

    return input.transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const database = tx as unknown as DatabaseTransaction;
      const key = this.createKey(modelProvider, modelId);
      await this.assertKeyAvailable(database, key);
      if (input.isDefault) {
        throw new Error("A manual platform model must be routed and activated before it can be default.");
      }

      const [createdModel] = await (database
        .insert(platformModels)
        .values({
          createdAt: now,
          description: String(input.description ?? "").trim(),
          isAvailable: false,
          isDefault: false,
          key,
          modelId,
          modelProvider,
          name: PlatformModelCatalogService.resolveName(input.name, modelId),
          reasoningLevels: this.resolveReasoningLevels(input.reasoningSupported, input.reasoningLevels),
          reasoningSupported: Boolean(input.reasoningSupported),
          updatedAt: now,
        })
        .returning?.(this.platformModelSelection()) ?? Promise.resolve([])) as Array<
          Omit<PlatformModelCatalogRecord, "routeCount">
        >;
      if (!createdModel) {
        throw new Error("Failed to create platform model.");
      }

      return {
        ...createdModel,
        routeCount: 0,
      };
    });
  }

  async importCredentialModel(input: {
    isDefault?: boolean | null;
    modelProvider?: string | null;
    platformModelProviderCredentialModelId: string;
    transactionProvider: TransactionProviderInterface;
  }): Promise<PlatformModelCatalogRecord> {
    const credentialModelId = PlatformModelCatalogService.requireTrimmed(
      input.platformModelProviderCredentialModelId,
      "platformModelProviderCredentialModelId",
    );
    const now = new Date();

    return input.transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const database = tx as unknown as DatabaseTransaction;
      const credentialModel = await this.loadCredentialModel(database, credentialModelId);
      const credential = await this.loadCredential(database, credentialModel.platformModelProviderCredentialId);
      if (!credentialModel.isAvailable) {
        throw new Error("Cannot import an unavailable credential model.");
      }
      if (credential.status !== "active") {
        throw new Error("Cannot import a model from an inactive platform credential.");
      }

      const modelProvider = String(input.modelProvider || "companyhelm").trim();
      const key = this.createKey(modelProvider, credentialModel.modelId);
      const existingModel = await this.loadModelByKey(database, key);
      const platformModel = existingModel ?? await this.createImportedModel(database, {
        credentialModel,
        isDefault: Boolean(input.isDefault),
        key,
        modelProvider,
        now,
      });
      await this.ensureRoute(database, platformModel.id, credentialModel.id, now);
      if (input.isDefault) {
        await this.setDefaultModel(database, platformModel.id, now);
      }

      return this.loadModel(database, platformModel.id);
    });
  }

  async updateModel(input: {
    description?: string | null;
    isAvailable?: boolean | null;
    isDefault?: boolean | null;
    name?: string | null;
    platformModelId: string;
    reasoningLevels?: string[] | null;
    reasoningSupported?: boolean | null;
    transactionProvider: TransactionProviderInterface;
  }): Promise<PlatformModelCatalogRecord> {
    const platformModelId = PlatformModelCatalogService.requireTrimmed(input.platformModelId, "platformModelId");
    const now = new Date();

    return input.transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const database = tx as unknown as DatabaseTransaction;
      const existingModel = await this.loadModel(database, platformModelId);
      const updateValues: Record<string, unknown> = {
        updatedAt: now,
      };
      if (typeof input.name === "string") {
        updateValues.name = PlatformModelCatalogService.resolveName(input.name, existingModel.modelId);
      }
      if (typeof input.description === "string") {
        updateValues.description = input.description.trim();
      }
      if (typeof input.reasoningSupported === "boolean") {
        updateValues.reasoningSupported = input.reasoningSupported;
        updateValues.reasoningLevels = this.resolveReasoningLevels(input.reasoningSupported, input.reasoningLevels);
      } else if (Array.isArray(input.reasoningLevels)) {
        updateValues.reasoningLevels = this.resolveReasoningLevels(existingModel.reasoningSupported, input.reasoningLevels);
      }
      if (typeof input.isAvailable === "boolean") {
        if (input.isAvailable) {
          const routeCount = await this.countRoutes(database, platformModelId);
          if (routeCount === 0) {
            throw new Error("A platform model must have at least one route before activation.");
          }
        }
        updateValues.isAvailable = input.isAvailable;
        if (!input.isAvailable) {
          updateValues.isDefault = false;
        }
      }
      if (typeof input.isDefault === "boolean") {
        if (input.isDefault) {
          const willBeAvailable = typeof input.isAvailable === "boolean" ? input.isAvailable : existingModel.isAvailable;
          if (!willBeAvailable) {
            throw new Error("Only available platform models can be default.");
          }
          await this.setDefaultModel(database, platformModelId, now);
        } else {
          updateValues.isDefault = false;
        }
      }

      await database
        .update(platformModels)
        .set(updateValues)
        .where(eq(platformModels.id, platformModelId));

      return this.loadModel(database, platformModelId);
    });
  }

  private async assertKeyAvailable(database: DatabaseTransaction, key: string): Promise<void> {
    const existingModel = await this.loadModelByKey(database, key);
    if (existingModel) {
      throw new Error("A platform model with this provider and model id already exists.");
    }
  }

  private async createImportedModel(
    database: DatabaseTransaction,
    input: {
      credentialModel: CredentialModelRecord;
      isDefault: boolean;
      key: string;
      modelProvider: string;
      now: Date;
    },
  ): Promise<Omit<PlatformModelCatalogRecord, "routeCount">> {
    const [createdModel] = await (database
      .insert(platformModels)
      .values({
        createdAt: input.now,
        description: input.credentialModel.description,
        isAvailable: true,
        isDefault: false,
        key: input.key,
        modelId: input.credentialModel.modelId,
        modelProvider: input.modelProvider,
        name: input.credentialModel.name,
        reasoningLevels: input.credentialModel.reasoningLevels,
        reasoningSupported: input.credentialModel.reasoningSupported,
        updatedAt: input.now,
      })
      .returning?.(this.platformModelSelection()) ?? Promise.resolve([])) as Array<
        Omit<PlatformModelCatalogRecord, "routeCount">
      >;
    if (!createdModel) {
      throw new Error("Failed to import platform model.");
    }
    if (input.isDefault) {
      await this.setDefaultModel(database, createdModel.id, input.now);
    }

    return createdModel;
  }

  private createKey(modelProvider: string, modelId: string): string {
    return `${modelProvider}:${modelId}`;
  }

  private async ensureRoute(
    database: DatabaseTransaction,
    platformModelId: string,
    platformModelProviderCredentialModelId: string,
    now: Date,
  ): Promise<void> {
    const [existingRoute] = await database
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

    await database
      .insert(platformModelRoutes)
      .values({
        createdAt: now,
        platformModelId,
        platformModelProviderCredentialModelId,
        updatedAt: now,
      });
  }

  private async loadCredential(database: DatabaseTransaction, credentialId: string): Promise<CredentialRecord> {
    const [credential] = await database
      .select({
        id: platformModelProviderCredentials.id,
        modelProvider: platformModelProviderCredentials.modelProvider,
        status: platformModelProviderCredentials.status,
      })
      .from(platformModelProviderCredentials)
      .where(eq(platformModelProviderCredentials.id, credentialId)) as CredentialRecord[];
    if (!credential) {
      throw new Error("Platform credential not found.");
    }

    return credential;
  }

  private async loadCredentialModel(
    database: DatabaseTransaction,
    credentialModelId: string,
  ): Promise<CredentialModelRecord> {
    const [credentialModel] = await database
      .select({
        description: platformModelProviderCredentialModels.description,
        id: platformModelProviderCredentialModels.id,
        isAvailable: platformModelProviderCredentialModels.isAvailable,
        modelId: platformModelProviderCredentialModels.modelId,
        name: platformModelProviderCredentialModels.name,
        platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
        reasoningLevels: platformModelProviderCredentialModels.reasoningLevels,
        reasoningSupported: platformModelProviderCredentialModels.reasoningSupported,
      })
      .from(platformModelProviderCredentialModels)
      .where(eq(platformModelProviderCredentialModels.id, credentialModelId)) as CredentialModelRecord[];
    if (!credentialModel) {
      throw new Error("Platform credential model not found.");
    }

    return credentialModel;
  }

  private async loadModel(
    database: DatabaseTransaction,
    platformModelId: string,
  ): Promise<PlatformModelCatalogRecord> {
    const [model] = await database
      .select(this.platformModelSelection())
      .from(platformModels)
      .where(eq(platformModels.id, platformModelId)) as Array<Omit<PlatformModelCatalogRecord, "routeCount">>;
    if (!model) {
      throw new Error("Platform model not found.");
    }

    return {
      ...model,
      routeCount: await this.countRoutes(database, platformModelId),
    };
  }

  private async loadModelByKey(
    database: DatabaseTransaction,
    key: string,
  ): Promise<Omit<PlatformModelCatalogRecord, "routeCount"> | null> {
    const [model] = await database
      .select(this.platformModelSelection())
      .from(platformModels)
      .where(eq(platformModels.key, key)) as Array<Omit<PlatformModelCatalogRecord, "routeCount">>;

    return model ?? null;
  }

  private async countRoutes(database: DatabaseTransaction, platformModelId: string): Promise<number> {
    const routes = await database
      .select({
        id: platformModelRoutes.id,
      })
      .from(platformModelRoutes)
      .where(eq(platformModelRoutes.platformModelId, platformModelId)) as Array<{ id: string }>;

    return routes.length;
  }

  private platformModelSelection(): Record<string, unknown> {
    return {
      createdAt: platformModels.createdAt,
      description: platformModels.description,
      id: platformModels.id,
      isAvailable: platformModels.isAvailable,
      isDefault: platformModels.isDefault,
      key: platformModels.key,
      modelId: platformModels.modelId,
      modelProvider: platformModels.modelProvider,
      name: platformModels.name,
      reasoningLevels: platformModels.reasoningLevels,
      reasoningSupported: platformModels.reasoningSupported,
      updatedAt: platformModels.updatedAt,
    };
  }

  private resolveReasoningLevels(
    reasoningSupported: boolean | null | undefined,
    reasoningLevels: string[] | null | undefined,
  ): string[] | null {
    if (!reasoningSupported) {
      return null;
    }

    return (reasoningLevels ?? [])
      .map((level) => level.trim())
      .filter((level) => level.length > 0);
  }

  private async setDefaultModel(
    database: DatabaseTransaction,
    platformModelId: string,
    now: Date,
  ): Promise<void> {
    await database
      .update(platformModels)
      .set({
        isDefault: false,
        updatedAt: now,
      })
      .where(eq(platformModels.isDefault, true));
    await database
      .update(platformModels)
      .set({
        isDefault: true,
        updatedAt: now,
      })
      .where(eq(platformModels.id, platformModelId));
  }

  private static requireTrimmed(value: string | null | undefined, fieldName: string): string {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      throw new Error(`${fieldName} is required.`);
    }

    return trimmed;
  }

  private static resolveName(value: string | null | undefined, fallback: string): string {
    const name = String(value || "").trim();

    return name || fallback;
  }
}
