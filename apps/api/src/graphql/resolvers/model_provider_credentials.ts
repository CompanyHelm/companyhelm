import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.js";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type ModelProviderCredentialRecord = {
  id: string;
  isDefault: boolean;
  companyId: string;
  name: string;
  modelProvider: ModelProviderId;
  type: "api_key" | "oauth_token";
  refreshToken: string | null;
  refreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: ModelProviderId;
  defaultModelId: string | null;
  defaultReasoningLevel: string | null;
  isDefault: boolean;
  type: "api_key" | "oauth_token";
  refreshToken: string | null;
  refreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ModelRecord = {
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  reasoningLevels: string[] | null;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Lists model provider credentials for the authenticated company resolved from the bearer token.
 */
@injectable()
export class ModelProviderCredentialsQueryResolver extends Resolver<GraphqlModelProviderCredentialRecord[]> {
  private readonly modelRegistry: ModelRegistry;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry()) {
    super();
    this.modelRegistry = modelRegistry;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlModelProviderCredentialRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const credentials = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          isDefault: modelProviderCredentials.isDefault,
          companyId: modelProviderCredentials.companyId,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          updatedAt: modelProviderCredentials.updatedAt,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, context.authSession.company.id)) as ModelProviderCredentialRecord[];
      const modelRecords = await selectableDatabase
        .select({
          isDefault: modelProviderCredentialModels.isDefault,
          modelId: modelProviderCredentialModels.modelId,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(eq(modelProviderCredentialModels.companyId, context.authSession.company.id)) as ModelRecord[];

      return credentials.map((credential) =>
        ModelProviderCredentialsQueryResolver.serializeRecord(this.modelRegistry, credential, modelRecords)
      );
    });
  };

  private static serializeRecord(
    modelRegistry: ModelRegistry,
    credential: ModelProviderCredentialRecord,
    models: ModelRecord[],
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
}
