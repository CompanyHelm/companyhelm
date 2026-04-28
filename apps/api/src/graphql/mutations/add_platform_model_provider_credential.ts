import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { platformModelProviderCredentialModels, platformModelProviderCredentials } from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.ts";
import {
  ModelProviderAuthorizationType,
  ModelProviderService,
} from "../../services/ai_providers/model_provider_service.ts";
import { PlatformModelProviderCredentialService } from "../../services/ai_providers/platform_model_provider_credential_service.ts";
import {
  PlatformModelProviderCredentialRecordPresenter,
  type GraphqlPlatformModelProviderCredentialRecord,
  type PlatformModelProviderCredentialModelRecord,
  type PlatformModelProviderCredentialRecord,
} from "../platform_model_provider_credential_record.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddPlatformModelProviderCredentialMutationArguments = {
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

type CredentialPayload = {
  accessToken: string;
  accessTokenExpiresAt: Date | null;
  refreshToken: string | null;
  type: "api_key" | "oauth_token";
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
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
 * Creates an operator-owned model credential after validating the credential against the provider
 * adapter. The mutation never writes company credential tables, preserving the platform/company
 * boundary until a later runtime integration explicitly opts into these credentials.
 */
@injectable()
export class AddPlatformModelProviderCredentialMutation extends Mutation<
  AddPlatformModelProviderCredentialMutationArguments,
  GraphqlPlatformModelProviderCredentialRecord
> {
  private readonly modelProviderService: ModelProviderService;
  private readonly presenter: PlatformModelProviderCredentialRecordPresenter;
  private readonly platformCredentialService: PlatformModelProviderCredentialService;

  constructor(
    @inject(PlatformModelProviderCredentialService)
    platformCredentialService: PlatformModelProviderCredentialService,
    @inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry(),
    @inject(ModelProviderService) modelProviderService: ModelProviderService = new ModelProviderService(),
  ) {
    super();
    this.modelProviderService = modelProviderService;
    this.presenter = new PlatformModelProviderCredentialRecordPresenter(modelRegistry);
    this.platformCredentialService = platformCredentialService;
  }

  protected resolve = async (
    arguments_: AddPlatformModelProviderCredentialMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformModelProviderCredentialRecord> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }

    const modelProvider = String(arguments_.input.modelProvider || "").trim();
    const providerDefinition = this.modelProviderService.get(modelProvider);
    if (this.modelProviderService.isSystemManagedProviderId(modelProvider)) {
      throw new Error("CompanyHelm model provider is not a platform credential provider.");
    }
    const credentialPayload = AddPlatformModelProviderCredentialMutation.resolveCredentialPayload(
      arguments_.input,
      providerDefinition.type,
    );
    const baseUrl = AddPlatformModelProviderCredentialMutation.resolveBaseUrl(arguments_.input.baseUrl, modelProvider);
    const models = await this.platformCredentialService.fetchModels({
      apiKey: credentialPayload.accessToken,
      baseUrl,
      modelProvider,
    });
    const defaultModelId = this.platformCredentialService.resolveDefaultModelId({
      modelIds: models.map((model) => model.modelId),
      modelProvider,
    });
    const now = new Date();

    const result = await transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const insertableDatabase = tx as unknown as InsertableDatabase;
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      const existingCredentials = await selectableDatabase
        .select({
          id: platformModelProviderCredentials.id,
          isDefault: platformModelProviderCredentials.isDefault,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.status, "active"));
      const shouldSetDefaultCredential = Boolean(arguments_.input.isDefault)
        || !existingCredentials.some((credential) => Boolean(credential.isDefault));
      const [createdCredential] = await (insertableDatabase
        .insert(platformModelProviderCredentials)
        .values({
          name: AddPlatformModelProviderCredentialMutation.resolveCredentialName(
            arguments_.input.name,
            providerDefinition.name,
          ),
          modelProvider,
          type: credentialPayload.type,
          encryptedApiKey: credentialPayload.accessToken,
          baseUrl,
          refreshToken: credentialPayload.refreshToken,
          accessTokenExpiresAt: credentialPayload.accessTokenExpiresAt,
          refreshedAt: credentialPayload.type === "oauth_token" ? now : null,
          isDefault: false,
          status: "active",
          errorMessage: null,
          createdByUserId: context.authSession?.user.id ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning?.({
          id: platformModelProviderCredentials.id,
          baseUrl: platformModelProviderCredentials.baseUrl,
          createdByUserId: platformModelProviderCredentials.createdByUserId,
          name: platformModelProviderCredentials.name,
          modelProvider: platformModelProviderCredentials.modelProvider,
          type: platformModelProviderCredentials.type,
          status: platformModelProviderCredentials.status,
          errorMessage: platformModelProviderCredentials.errorMessage,
          refreshToken: platformModelProviderCredentials.refreshToken,
          refreshedAt: platformModelProviderCredentials.refreshedAt,
          createdAt: platformModelProviderCredentials.createdAt,
          isDefault: platformModelProviderCredentials.isDefault,
          updatedAt: platformModelProviderCredentials.updatedAt,
        }) ?? Promise.resolve([])) as PlatformModelProviderCredentialRecord[];
      if (!createdCredential) {
        throw new Error("Failed to create platform model provider credential.");
      }

      if (models.length > 0) {
        await insertableDatabase
          .insert(platformModelProviderCredentialModels)
          .values(models.map((model) =>
            this.platformCredentialService.toModelInsertInput({
              model,
              now,
              platformModelProviderCredentialId: createdCredential.id,
            })
          ));
      }
      if (shouldSetDefaultCredential) {
        await this.setDefaultCredential(updatableDatabase, createdCredential.id, now);
      }
      if (defaultModelId) {
        await this.setDefaultModel(updatableDatabase, createdCredential.id, defaultModelId, now);
      }

      const [credential] = await selectableDatabase
        .select({
          id: platformModelProviderCredentials.id,
          baseUrl: platformModelProviderCredentials.baseUrl,
          createdByUserId: platformModelProviderCredentials.createdByUserId,
          name: platformModelProviderCredentials.name,
          modelProvider: platformModelProviderCredentials.modelProvider,
          type: platformModelProviderCredentials.type,
          status: platformModelProviderCredentials.status,
          errorMessage: platformModelProviderCredentials.errorMessage,
          refreshToken: platformModelProviderCredentials.refreshToken,
          refreshedAt: platformModelProviderCredentials.refreshedAt,
          createdAt: platformModelProviderCredentials.createdAt,
          isDefault: platformModelProviderCredentials.isDefault,
          updatedAt: platformModelProviderCredentials.updatedAt,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, createdCredential.id)) as PlatformModelProviderCredentialRecord[];
      const storedModels = await selectableDatabase
        .select({
          description: platformModelProviderCredentialModels.description,
          id: platformModelProviderCredentialModels.id,
          isDefault: platformModelProviderCredentialModels.isDefault,
          modelId: platformModelProviderCredentialModels.modelId,
          name: platformModelProviderCredentialModels.name,
          platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
          reasoningSupported: platformModelProviderCredentialModels.reasoningSupported,
          reasoningLevels: platformModelProviderCredentialModels.reasoningLevels,
          createdAt: platformModelProviderCredentialModels.createdAt,
          updatedAt: platformModelProviderCredentialModels.updatedAt,
        })
        .from(platformModelProviderCredentialModels)
        .where(eq(
          platformModelProviderCredentialModels.platformModelProviderCredentialId,
          createdCredential.id,
        )) as PlatformModelProviderCredentialModelRecord[];

      return { credential, storedModels };
    });

    if (!result.credential) {
      throw new Error("Failed to create platform model provider credential.");
    }

    return this.presenter.serializeCredential(result.credential, result.storedModels);
  };

  private async setDefaultCredential(
    database: UpdatableDatabase,
    credentialId: string,
    now: Date,
  ): Promise<void> {
    await database
      .update(platformModelProviderCredentials)
      .set({
        isDefault: false,
        updatedAt: now,
      })
      .where(eq(platformModelProviderCredentials.isDefault, true));
    await database
      .update(platformModelProviderCredentials)
      .set({
        isDefault: true,
        updatedAt: now,
      })
      .where(eq(platformModelProviderCredentials.id, credentialId));
  }

  private async setDefaultModel(
    database: UpdatableDatabase,
    credentialId: string,
    modelId: string,
    now: Date,
  ): Promise<void> {
    await database
      .update(platformModelProviderCredentialModels)
      .set({
        isDefault: false,
        updatedAt: now,
      })
      .where(eq(platformModelProviderCredentialModels.platformModelProviderCredentialId, credentialId));
    await database
      .update(platformModelProviderCredentialModels)
      .set({
        isDefault: true,
        updatedAt: now,
      })
      .where(and(
        eq(platformModelProviderCredentialModels.platformModelProviderCredentialId, credentialId),
        eq(platformModelProviderCredentialModels.modelId, modelId),
      ));
  }

  private assertPlatformAdmin(context: GraphqlRequestContext): void {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    if (context.authSession.user.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
  }

  private static resolveCredentialPayload(
    input: AddPlatformModelProviderCredentialMutationArguments["input"],
    authorizationType: ModelProviderAuthorizationType,
  ): CredentialPayload {
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

  private static resolveBaseUrl(rawBaseUrl: string | null | undefined, modelProvider: string): string | null {
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

  private static resolveCredentialName(rawCredentialName: string | null | undefined, providerName: string): string {
    const normalizedCredentialName = String(rawCredentialName || "").trim();
    return normalizedCredentialName || providerName;
  }
}
