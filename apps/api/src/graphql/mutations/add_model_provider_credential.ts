import { decorate, inject, injectable } from "inversify";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { modelProviderCredentials } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddModelProviderCredentialMutationArguments = {
  input: {
    apiKey: string;
    modelProvider: string;
    name: string;
    refreshToken?: string | null;
    type: string;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: "openai";
  type: "api_key" | "oauth_token";
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
 * Creates a new model provider credential for the company identified by the x-company-id header.
 */
@injectable("Singleton")
export class AddModelProviderCredentialMutation extends Mutation<
  AddModelProviderCredentialMutationArguments,
  ModelProviderCredentialRecord
> {
  private readonly database: Pick<AppRuntimeDatabase, "getDatabase">;

  constructor(database: Pick<AppRuntimeDatabase, "getDatabase">) {
    super();
    this.database = database;
  }

  protected resolve = async (
    arguments_: AddModelProviderCredentialMutationArguments,
    context: GraphqlRequestContext,
  ) => {
    const companyId = String(context.companyId || "").trim();
    if (!companyId) {
      throw new Error("Missing x-company-id header.");
    }

    const normalizedName = String(arguments_.input.name || "").trim();
    if (!normalizedName) {
      throw new Error("Credential name is required.");
    }

    const modelProvider = AddModelProviderCredentialMutation.normalizeModelProvider(
      arguments_.input.modelProvider,
    );
    const credentialType = AddModelProviderCredentialMutation.normalizeCredentialType(
      arguments_.input.type,
    );
    const normalizedApiKey = String(arguments_.input.apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("apiKey is required.");
    }

    const normalizedRefreshToken = String(arguments_.input.refreshToken || "").trim() || null;
    if (credentialType === "oauth_token" && !normalizedRefreshToken) {
      throw new Error("refreshToken is required for oauth_token credentials.");
    }

    const now = new Date();
    const database = this.database.getDatabase() as InsertableDatabase;
    const [credential] = await database
      .insert(modelProviderCredentials)
      .values({
        companyId,
        name: normalizedName,
        modelProvider,
        type: credentialType,
        encryptedApiKey: normalizedApiKey,
        refreshToken: normalizedRefreshToken,
        refreshedAt: credentialType === "oauth_token" ? now : null,
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
      }) as ModelProviderCredentialRecord[];

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

  private static normalizeCredentialType(rawCredentialType: string): "api_key" | "oauth_token" {
    const normalizedCredentialType = String(rawCredentialType || "").trim();
    if (normalizedCredentialType !== "api_key" && normalizedCredentialType !== "oauth_token") {
      throw new Error("Unsupported credential type.");
    }
    return normalizedCredentialType;
  }
}

decorate(inject(AppRuntimeDatabase), AddModelProviderCredentialMutation, 0);
