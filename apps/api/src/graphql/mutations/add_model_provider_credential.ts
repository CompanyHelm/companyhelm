import { inject, injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { ModelManager, type ModelProviderModel } from "../../model_manager.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddModelProviderCredentialMutationArguments = {
  input: {
    apiKey: string;
    modelProvider: string;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: "openai";
  type: "api_key";
  refreshToken: string | null;
  refreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: "openai";
  type: "api_key";
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
  private readonly modelManager: ModelManager;

  constructor(@inject(ModelManager) modelManager: ModelManager) {
    super();
    this.modelManager = modelManager;
  }

  protected resolve = async (
    arguments_: AddModelProviderCredentialMutationArguments,
    context: GraphqlRequestContext,
  ) => {
    const modelProvider = AddModelProviderCredentialMutation.normalizeModelProvider(
      arguments_.input.modelProvider,
    );
    const normalizedApiKey = String(arguments_.input.apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("apiKey is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const models = await this.modelManager.fetchModels(modelProvider, normalizedApiKey);
    const now = new Date();
    const [credential] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const createdCredentials = await insertableDatabase
        .insert(modelProviderCredentials)
        .values({
          companyId: context.authSession.company.id,
          name: AddModelProviderCredentialMutation.resolveCredentialName(modelProvider),
          modelProvider,
          type: "api_key",
          encryptedApiKey: normalizedApiKey,
          refreshToken: null,
          refreshedAt: null,
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
            createdAt: now,
            updatedAt: now,
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
    createdAt: Date;
    updatedAt: Date;
  }): Record<string, unknown> {
    return {
      companyId: input.companyId,
      modelProviderCredentialId: input.modelProviderCredentialId,
      name: input.model.name,
      reasoningLevels: input.model.reasoningLevels,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }

  private static normalizeModelProvider(rawModelProvider: string): "openai" {
    const normalizedModelProvider = String(rawModelProvider || "").trim();
    if (normalizedModelProvider !== "openai") {
      throw new Error("Unsupported model provider.");
    }
    return normalizedModelProvider;
  }

  private static resolveCredentialName(modelProvider: "openai"): string {
    if (modelProvider === "openai") {
      return "OpenAI / Codex";
    }

    throw new Error("Unsupported model provider.");
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
