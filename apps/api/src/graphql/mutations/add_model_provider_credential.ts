import { inject, injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
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
    name?: string | null;
    modelProvider: string;
    refreshToken?: string | null;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: string;
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
  modelProvider: string;
  type: "api_key" | "oauth_token";
  refreshToken: string | null;
  refreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): {
      returning?(selection?: Record<string, unknown>): Promise<ModelProviderCredentialRecord[]>;
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
  private readonly modelProviderService: ModelProviderService;

  constructor(
    @inject(ModelService) modelManager: ModelService,
    @inject(ModelProviderService) modelProviderService: ModelProviderService = new ModelProviderService(),
  ) {
    super();
    this.modelManager = modelManager;
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
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const credentialPayload = AddModelProviderCredentialMutation.resolveCredentialPayload(
      arguments_.input,
      providerDefinition.type,
    );
    const models = await this.modelManager.fetchModels(modelProvider, credentialPayload.accessToken);
    const now = new Date();
    const [credential] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const createdCredentials = await insertableDatabase
        .insert(modelProviderCredentials)
        .values({
          companyId: context.authSession.company.id,
          name: credentialName,
          modelProvider,
          type: credentialPayload.type,
          encryptedApiKey: credentialPayload.accessToken,
          refreshToken: credentialPayload.refreshToken,
          accessTokenExpiresAt: credentialPayload.accessTokenExpiresAt,
          refreshedAt: credentialPayload.type === "oauth_token" ? now : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning?.({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          updatedAt: modelProviderCredentials.updatedAt,
        }) as Promise<ModelProviderCredentialRecord[]>;

      const createdCredential = createdCredentials?.[0];
      if (!createdCredential) {
        return [];
      }

      if (models.length > 0) {
        await insertableDatabase
          .insert(modelProviderCredentialModels)
          .values(models.map((model) => AddModelProviderCredentialMutation.toModelInsertInput({
            model,
            companyId: context.authSession.company.id,
            modelProviderCredentialId: createdCredential.id,
          })));
      }

      return [createdCredential];
    });

    if (!credential) {
      throw new Error("Failed to create model provider credential.");
    }

    return AddModelProviderCredentialMutation.serializeRecord(credential);
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
      reasoningLevels: input.model.reasoningLevels,
    };
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
    credential: ModelProviderCredentialRecord,
  ): GraphqlModelProviderCredentialRecord {
    return {
      ...credential,
      refreshedAt: credential.refreshedAt?.toISOString() ?? null,
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
    };
  }
}
