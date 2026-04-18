import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { CompanyHelmLlmProviderService } from "../../services/ai_providers/companyhelm_service.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.js";
import {
  ModelProviderAuthorizationType,
  ModelProviderService,
} from "../../services/ai_providers/model_provider_service.js";
import { ModelService, type ModelProviderModel } from "../../services/ai_providers/model_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddModelProviderCredentialMutationArguments = {
  input: {
    accessToken?: string | null;
    accessTokenExpiresAtMilliseconds?: string | null;
    apiKey?: string | null;
    baseUrl?: string | null;
    isDefault?: boolean | null;
    name?: string | null;
    modelProvider: string;
    refreshToken?: string | null;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  baseUrl: string | null;
  name: string;
  modelProvider: string;
  type: "api_key" | "oauth_token";
  status: "active" | "error";
  errorMessage: string | null;
  refreshToken: string | null;
  refreshedAt: Date | null;
  createdAt: Date;
  isDefault: boolean;
  isManaged: boolean;
  updatedAt: Date;
};

type GraphqlModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  baseUrl: string | null;
  name: string;
  modelProvider: string;
  defaultModelId: string | null;
  defaultReasoningLevel: string | null;
  isDefault: boolean;
  isManaged: boolean;
  type: "api_key" | "oauth_token";
  status: "active" | "error";
  errorMessage: string | null;
  refreshToken: string | null;
  refreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<ModelProviderCredentialRecord[]>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): {
      returning?(selection?: Record<string, unknown>): Promise<ModelProviderCredentialRecord[]>;
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
 * Creates a new model provider credential for the authenticated company resolved from the bearer token.
 */
@injectable()
export class AddModelProviderCredentialMutation extends Mutation<
  AddModelProviderCredentialMutationArguments,
  GraphqlModelProviderCredentialRecord
> {
  private readonly modelManager: ModelService;
  private readonly modelRegistry: ModelRegistry;
  private readonly modelProviderService: ModelProviderService;

  constructor(
    @inject(ModelService) modelManager: ModelService,
    @inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry(),
    @inject(ModelProviderService) modelProviderService: ModelProviderService = new ModelProviderService(),
  ) {
    super();
    this.modelManager = modelManager;
    this.modelRegistry = modelRegistry;
    this.modelProviderService = modelProviderService;
  }

  protected resolve = async (
    arguments_: AddModelProviderCredentialMutationArguments,
    context: GraphqlRequestContext,
  ) => {
    const modelProvider = String(arguments_.input.modelProvider || "").trim();
    const providerDefinition = this.modelProviderService.get(modelProvider);
    const credentialName = AddModelProviderCredentialMutation.resolveCredentialName(
      arguments_.input.name,
      providerDefinition,
    );
    if (CompanyHelmLlmProviderService.CREDENTIAL_NAME === credentialName) {
      throw new Error("CompanyHelm model provider is managed by the system.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const companyId = context.authSession.company.id;

    const credentialPayload = AddModelProviderCredentialMutation.resolveCredentialPayload(
      arguments_.input,
      providerDefinition.type,
    );
    const baseUrl = AddModelProviderCredentialMutation.resolveBaseUrl(
      arguments_.input.baseUrl,
      modelProvider,
    );
    const models = await this.modelManager.fetchModels(modelProvider, credentialPayload.accessToken, {
      baseUrl,
    });
    const defaultModelId = AddModelProviderCredentialMutation.resolveDefaultModelId(
      this.modelRegistry,
      modelProvider,
      models,
    );
    const now = new Date();
    const [credential] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const insertableDatabase = tx as unknown as InsertableDatabase;
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      const existingCredentials = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          baseUrl: modelProviderCredentials.baseUrl,
          companyId: modelProviderCredentials.companyId,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          status: modelProviderCredentials.status,
          errorMessage: modelProviderCredentials.errorMessage,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          isDefault: modelProviderCredentials.isDefault,
          isManaged: modelProviderCredentials.isManaged,
          updatedAt: modelProviderCredentials.updatedAt,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, companyId));
      const shouldSetDefaultCredential = Boolean(arguments_.input.isDefault)
        || !existingCredentials.some((existingCredential) => existingCredential.isDefault);
      const createdCredentials = await (insertableDatabase
        .insert(modelProviderCredentials)
        .values({
          companyId,
          name: credentialName,
          modelProvider,
          type: credentialPayload.type,
          encryptedApiKey: credentialPayload.accessToken,
          baseUrl,
          refreshToken: credentialPayload.refreshToken,
          accessTokenExpiresAt: credentialPayload.accessTokenExpiresAt,
          refreshedAt: credentialPayload.type === "oauth_token" ? now : null,
          isDefault: false,
          isManaged: false,
          status: "active",
          errorMessage: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning?.({
          id: modelProviderCredentials.id,
          baseUrl: modelProviderCredentials.baseUrl,
          companyId: modelProviderCredentials.companyId,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          status: modelProviderCredentials.status,
          errorMessage: modelProviderCredentials.errorMessage,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          isDefault: modelProviderCredentials.isDefault,
          isManaged: modelProviderCredentials.isManaged,
          updatedAt: modelProviderCredentials.updatedAt,
        }) ?? Promise.resolve([]));

      const createdCredential = createdCredentials?.[0];
      if (!createdCredential) {
        return [];
      }

      if (models.length > 0) {
        await insertableDatabase
          .insert(modelProviderCredentialModels)
          .values(models.map((model) => AddModelProviderCredentialMutation.toModelInsertInput({
            model,
            companyId,
            modelProviderCredentialId: createdCredential.id,
          })));
      }

      if (shouldSetDefaultCredential) {
        await AddModelProviderCredentialMutation.setDefaultCredential(
          updatableDatabase,
          companyId,
          createdCredential.id,
        );
      }
      if (defaultModelId) {
        await AddModelProviderCredentialMutation.setDefaultModel(
          updatableDatabase,
          companyId,
          createdCredential.id,
          defaultModelId,
        );
      }

      const reloadedCredentials = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          baseUrl: modelProviderCredentials.baseUrl,
          companyId: modelProviderCredentials.companyId,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          status: modelProviderCredentials.status,
          errorMessage: modelProviderCredentials.errorMessage,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          isDefault: modelProviderCredentials.isDefault,
          isManaged: modelProviderCredentials.isManaged,
          updatedAt: modelProviderCredentials.updatedAt,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, createdCredential.id),
        ));

      return reloadedCredentials;
    });

    if (!credential) {
      throw new Error("Failed to create model provider credential.");
    }

    return AddModelProviderCredentialMutation.serializeRecord(
      this.modelRegistry,
      credential,
      defaultModelId,
      models,
    );
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
      reasoningSupported: input.model.reasoningSupported,
      reasoningLevels: input.model.reasoningLevels,
      isDefault: false,
    };
  }

  private static resolveDefaultModelId(
    modelRegistry: ModelRegistry,
    modelProvider: string,
    models: ModelProviderModel[],
  ): string | null {
    const providerDefaultModelId = modelRegistry.getDefaultModelForProvider(modelProvider);
    if (providerDefaultModelId && models.some((model) => model.modelId === providerDefaultModelId)) {
      return providerDefaultModelId;
    }

    return models[0]?.modelId ?? null;
  }

  private static resolveDefaultReasoningLevel(
    modelRegistry: ModelRegistry,
    credential: ModelProviderCredentialRecord,
    models: ModelProviderModel[],
    defaultModelId: string | null,
  ): string | null {
    if (!defaultModelId) {
      return null;
    }

    const defaultModel = models.find((model) => model.modelId === defaultModelId);
    const supportedLevels = defaultModel?.reasoningLevels ?? [];
    if (supportedLevels.length === 0) {
      return null;
    }

    const providerDefaultReasoningLevel = modelRegistry.getDefaultReasoningLevelForProvider(
      credential.modelProvider,
    );
    if (providerDefaultReasoningLevel && supportedLevels.includes(providerDefaultReasoningLevel)) {
      return providerDefaultReasoningLevel;
    }

    return supportedLevels[0] ?? null;
  }

  private static async setDefaultCredential(
    updatableDatabase: UpdatableDatabase,
    companyId: string,
    credentialId: string,
  ): Promise<void> {
    await updatableDatabase
      .update(modelProviderCredentials)
      .set({
        isDefault: false,
      })
      .where(eq(modelProviderCredentials.companyId, companyId));
    await updatableDatabase
      .update(modelProviderCredentials)
      .set({
        isDefault: true,
      })
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.id, credentialId),
      ));
  }

  private static async setDefaultModel(
    updatableDatabase: UpdatableDatabase,
    companyId: string,
    credentialId: string,
    modelId: string,
  ): Promise<void> {
    await updatableDatabase
      .update(modelProviderCredentialModels)
      .set({
        isDefault: false,
      })
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
      ));
    await updatableDatabase
      .update(modelProviderCredentialModels)
      .set({
        isDefault: true,
      })
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
        eq(modelProviderCredentialModels.modelId, modelId),
      ));
  }

  private static resolveCredentialPayload(
    input: AddModelProviderCredentialMutationArguments["input"],
    authorizationType: ModelProviderAuthorizationType,
  ): {
    accessToken: string;
    accessTokenExpiresAt: Date | null;
    refreshToken: string | null;
    type: "api_key" | "oauth_token";
  } {
    if (authorizationType === ModelProviderAuthorizationType.ApiKey) {
      const normalizedApiKey = String(input.apiKey || "").trim();
      if (!normalizedApiKey) {
        throw new Error("apiKey is required.");
      }

      return {
        accessToken: normalizedApiKey,
        accessTokenExpiresAt: null,
        refreshToken: null,
        type: "api_key",
      };
    }

    if (authorizationType === ModelProviderAuthorizationType.Oauth) {
      const normalizedAccessToken = String(input.accessToken || "").trim();
      if (!normalizedAccessToken) {
        throw new Error("accessToken is required.");
      }

      const normalizedRefreshToken = String(input.refreshToken || "").trim();
      if (!normalizedRefreshToken) {
        throw new Error("refreshToken is required.");
      }

      const expiresAtMilliseconds = Number(String(input.accessTokenExpiresAtMilliseconds || "").trim());
      if (!Number.isFinite(expiresAtMilliseconds) || expiresAtMilliseconds <= 0) {
        throw new Error("accessTokenExpiresAtMilliseconds must be a valid Unix timestamp in milliseconds.");
      }

      return {
        accessToken: normalizedAccessToken,
        accessTokenExpiresAt: new Date(expiresAtMilliseconds),
        refreshToken: normalizedRefreshToken,
        type: "oauth_token",
      };
    }

    throw new Error("Unsupported authorization type.");
  }

  private static resolveBaseUrl(
    rawBaseUrl: string | null | undefined,
    modelProvider: string,
  ): string | null {
    if (modelProvider !== "openai-compatible") {
      return null;
    }

    const normalizedBaseUrl = String(rawBaseUrl || "").trim();
    if (!normalizedBaseUrl) {
      throw new Error("baseUrl is required for OpenAI-compatible providers.");
    }

    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(normalizedBaseUrl);
    } catch {
      throw new Error("baseUrl must be a valid HTTP(S) URL.");
    }
    if (parsedBaseUrl.protocol !== "http:" && parsedBaseUrl.protocol !== "https:") {
      throw new Error("baseUrl must be a valid HTTP(S) URL.");
    }

    return normalizedBaseUrl;
  }

  private static resolveCredentialName(
    rawCredentialName: string | null | undefined,
    providerDefinition: { name: string },
  ): string {
    const normalizedCredentialName = String(rawCredentialName || "").trim();
    if (normalizedCredentialName) {
      return normalizedCredentialName;
    }

    return providerDefinition.name;
  }

  private static serializeRecord(
    modelRegistry: ModelRegistry,
    credential: ModelProviderCredentialRecord,
    defaultModelId: string | null,
    models: ModelProviderModel[],
  ): GraphqlModelProviderCredentialRecord {
    return {
      ...credential,
      defaultModelId,
      defaultReasoningLevel: AddModelProviderCredentialMutation.resolveDefaultReasoningLevel(
        modelRegistry,
        credential,
        models,
        defaultModelId,
      ),
      refreshedAt: credential.refreshedAt?.toISOString() ?? null,
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
    };
  }
}
