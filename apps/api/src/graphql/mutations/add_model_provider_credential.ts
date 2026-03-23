import { injectable } from "inversify";
import { modelProviderCredentials } from "../../db/schema.ts";
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

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
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
  ModelProviderCredentialRecord
> {
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

    const now = new Date();
    const [credential] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      return insertableDatabase
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
    });

    if (!credential) {
      throw new Error("Failed to create model provider credential.");
    }

    return credential;
  };

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
}
