import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.js";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type SetDefaultModelProviderCredentialMutationArguments = {
  input: {
    id: string;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  createdAt: Date;
  isDefault: boolean;
  isManaged: boolean;
  modelProvider: ModelProviderId;
  name: string;
  status: "active" | "error";
  errorMessage: string | null;
  refreshedAt: Date | null;
  refreshToken: string | null;
  type: "api_key" | "oauth_token";
  updatedAt: Date;
};

type ModelProviderCredentialModelRecord = {
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  reasoningLevels: string[] | null;
};

type GraphqlModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  createdAt: string;
  defaultModelId: string | null;
  defaultReasoningLevel: string | null;
  isDefault: boolean;
  isManaged: boolean;
  modelProvider: ModelProviderId;
  name: string;
  status: "active" | "error";
  errorMessage: string | null;
  refreshedAt: string | null;
  refreshToken: string | null;
  type: "api_key" | "oauth_token";
  updatedAt: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
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
 * Promotes one company model credential to the singleton default used when creating new agents.
 */
@injectable()
export class SetDefaultModelProviderCredentialMutation extends Mutation<
  SetDefaultModelProviderCredentialMutationArguments,
  GraphqlModelProviderCredentialRecord
> {
  protected resolve = async (
    arguments_: SetDefaultModelProviderCredentialMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlModelProviderCredentialRecord> => {
    const credentialId = String(arguments_.input.id || "").trim();
    if (!credentialId) {
      throw new Error("id is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const companyId = context.authSession.company.id;
    const modelRegistry = new ModelRegistry();
    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      const credentials = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          createdAt: modelProviderCredentials.createdAt,
          isDefault: modelProviderCredentials.isDefault,
          isManaged: modelProviderCredentials.isManaged,
          modelProvider: modelProviderCredentials.modelProvider,
          name: modelProviderCredentials.name,
          status: modelProviderCredentials.status,
          errorMessage: modelProviderCredentials.errorMessage,
          refreshedAt: modelProviderCredentials.refreshedAt,
          refreshToken: modelProviderCredentials.refreshToken,
          type: modelProviderCredentials.type,
          updatedAt: modelProviderCredentials.updatedAt,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, companyId)) as ModelProviderCredentialRecord[];
      if (!credentials.some((credential) => credential.id === credentialId)) {
        throw new Error("Credential not found.");
      }

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

      const [credential] = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          createdAt: modelProviderCredentials.createdAt,
          isDefault: modelProviderCredentials.isDefault,
          isManaged: modelProviderCredentials.isManaged,
          modelProvider: modelProviderCredentials.modelProvider,
          name: modelProviderCredentials.name,
          status: modelProviderCredentials.status,
          errorMessage: modelProviderCredentials.errorMessage,
          refreshedAt: modelProviderCredentials.refreshedAt,
          refreshToken: modelProviderCredentials.refreshToken,
          type: modelProviderCredentials.type,
          updatedAt: modelProviderCredentials.updatedAt,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, credentialId),
        )) as ModelProviderCredentialRecord[];
      if (!credential) {
        throw new Error("Credential not found.");
      }

      const models = await selectableDatabase
        .select({
          isDefault: modelProviderCredentialModels.isDefault,
          modelId: modelProviderCredentialModels.modelId,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, companyId),
          eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
        )) as ModelProviderCredentialModelRecord[];
      const defaultModel = models.find((model) => model.isDefault) ?? null;
      const supportedReasoningLevels = defaultModel?.reasoningLevels ?? [];
      const providerDefaultReasoningLevel = modelRegistry.getDefaultReasoningLevelForProvider(
        credential.modelProvider,
      );

      return {
        ...credential,
        createdAt: credential.createdAt.toISOString(),
        defaultModelId: defaultModel?.modelId ?? null,
        defaultReasoningLevel: providerDefaultReasoningLevel
          && supportedReasoningLevels.includes(providerDefaultReasoningLevel)
          ? providerDefaultReasoningLevel
          : (supportedReasoningLevels[0] ?? null),
        refreshedAt: credential.refreshedAt?.toISOString() ?? null,
        updatedAt: credential.updatedAt.toISOString(),
      };
    });
  };
}
