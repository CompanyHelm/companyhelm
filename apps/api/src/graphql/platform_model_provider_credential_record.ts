import { ModelRegistry } from "../services/ai_providers/model_registry.ts";
import type { ModelProviderId } from "../services/ai_providers/model_provider_service.ts";

export type PlatformModelProviderCredentialRecord = {
  id: string;
  baseUrl: string | null;
  createdByUserId: string | null;
  name: string;
  modelProvider: ModelProviderId;
  type: "api_key" | "oauth_token";
  status: "active" | "error";
  errorMessage: string | null;
  refreshToken: string | null;
  refreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformModelProviderCredentialModelRecord = {
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
  updatedAt: Date;
};

export type GraphqlPlatformModelProviderCredentialRecord = {
  id: string;
  baseUrl: string | null;
  createdByUserId: string | null;
  name: string;
  modelProvider: ModelProviderId;
  defaultModelId: string | null;
  defaultReasoningLevel: string | null;
  type: "api_key" | "oauth_token";
  status: "active" | "error";
  errorMessage: string | null;
  refreshToken: string | null;
  refreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GraphqlPlatformModelProviderCredentialModelRecord = {
  description: string;
  id: string;
  isAvailable: boolean;
  isDefault: boolean;
  modelId: string;
  name: string;
  platformModelProviderCredentialId: string;
  reasoningSupported: boolean;
  reasoningLevels: string[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Converts platform credential rows into the public GraphQL shape while deriving default-model
 * metadata from the separately stored model rows. Keeping the serialization here prevents platform
 * admin resolvers from reimplementing the same default reasoning-level fallback.
 */
export class PlatformModelProviderCredentialRecordPresenter {
  private readonly modelRegistry: ModelRegistry;

  constructor(modelRegistry: ModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  serializeCredential(
    credential: PlatformModelProviderCredentialRecord,
    models: PlatformModelProviderCredentialModelRecord[],
  ): GraphqlPlatformModelProviderCredentialRecord {
    const defaultModel = models.find((model) =>
      model.platformModelProviderCredentialId === credential.id && model.isDefault
    ) ?? null;
    const supportedReasoningLevels = defaultModel?.reasoningLevels ?? [];
    const providerDefaultReasoningLevel = this.modelRegistry.getDefaultReasoningLevelForProvider(
      credential.modelProvider,
    );

    return {
      ...credential,
      defaultModelId: defaultModel?.modelId ?? null,
      defaultReasoningLevel: providerDefaultReasoningLevel
          && supportedReasoningLevels.includes(providerDefaultReasoningLevel)
        ? providerDefaultReasoningLevel
        : (supportedReasoningLevels[0] ?? null),
      refreshedAt: credential.refreshedAt?.toISOString() ?? null,
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
    };
  }

  serializeModel(
    model: PlatformModelProviderCredentialModelRecord,
  ): GraphqlPlatformModelProviderCredentialModelRecord {
    return {
      ...model,
      reasoningLevels: model.reasoningLevels ?? [],
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
    };
  }
}
