import { ModelRegistry } from "../services/ai_providers/model_registry.js";
import type { ModelProviderId } from "../services/ai_providers/model_provider_service.js";

export type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: ModelProviderId;
  type: "api_key" | "oauth_token";
  status: "active" | "error";
  errorMessage: string | null;
  refreshToken: string | null;
  refreshedAt: Date | null;
  createdAt: Date;
  isDefault: boolean;
  updatedAt: Date;
};

export type ModelProviderCredentialModelRecord = {
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  reasoningLevels: string[] | null;
};

export type GraphqlModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: ModelProviderId;
  defaultModelId: string | null;
  defaultReasoningLevel: string | null;
  isDefault: boolean;
  type: "api_key" | "oauth_token";
  status: "active" | "error";
  errorMessage: string | null;
  refreshToken: string | null;
  refreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeModelProviderCredentialRecord(
  modelRegistry: ModelRegistry,
  credential: ModelProviderCredentialRecord,
  models: ModelProviderCredentialModelRecord[],
): GraphqlModelProviderCredentialRecord {
  const defaultModel = models.find((model) =>
    model.modelProviderCredentialId === credential.id && model.isDefault
  ) ?? null;
  const supportedReasoningLevels = defaultModel?.reasoningLevels ?? [];
  const providerDefaultReasoningLevel = modelRegistry.getDefaultReasoningLevelForProvider(credential.modelProvider);

  return {
    ...credential,
    defaultModelId: defaultModel?.modelId ?? null,
    defaultReasoningLevel: providerDefaultReasoningLevel && supportedReasoningLevels.includes(providerDefaultReasoningLevel)
      ? providerDefaultReasoningLevel
      : (supportedReasoningLevels[0] ?? null),
    refreshedAt: credential.refreshedAt?.toISOString() ?? null,
    createdAt: credential.createdAt.toISOString(),
    updatedAt: credential.updatedAt.toISOString(),
  };
}
