import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { platformModelProviderCredentialModels, platformModelProviderCredentials } from "../../db/schema.ts";
import {
  LlmOauthCredentialRefreshService,
} from "../../services/ai_providers/llm_oauth_credential_refresh_service.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.ts";
import {
  PlatformModelProviderCredentialRecordPresenter,
  type GraphqlPlatformModelProviderCredentialRecord,
  type PlatformModelProviderCredentialModelRecord,
  type PlatformModelProviderCredentialRecord,
} from "../platform_model_provider_credential_record.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type RefreshPlatformModelProviderCredentialTokenMutationArguments = {
  input: {
    platformModelProviderCredentialId: string;
  };
};

type RefreshableCredentialRecord = PlatformModelProviderCredentialRecord & {
  encryptedApiKey: string;
  accessTokenExpiresAt: Date | null;
};

/**
 * Manually refreshes one OAuth-backed platform credential. It reuses the existing provider OAuth
 * refresh adapter while updating only platform credential rows.
 */
@injectable()
export class RefreshPlatformModelProviderCredentialTokenMutation extends Mutation<
  RefreshPlatformModelProviderCredentialTokenMutationArguments,
  GraphqlPlatformModelProviderCredentialRecord
> {
  private readonly presenter: PlatformModelProviderCredentialRecordPresenter;
  private readonly refreshService: LlmOauthCredentialRefreshService;

  constructor(
    @inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry(),
    @inject(LlmOauthCredentialRefreshService)
    refreshService: LlmOauthCredentialRefreshService = new LlmOauthCredentialRefreshService(),
  ) {
    super();
    this.presenter = new PlatformModelProviderCredentialRecordPresenter(modelRegistry);
    this.refreshService = refreshService;
  }

  protected resolve = async (
    arguments_: RefreshPlatformModelProviderCredentialTokenMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformModelProviderCredentialRecord> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }
    const credentialId = String(arguments_.input.platformModelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("platformModelProviderCredentialId is required.");
    }

    return transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const [credential] = await tx
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
          updatedAt: platformModelProviderCredentials.updatedAt,
          encryptedApiKey: platformModelProviderCredentials.encryptedApiKey,
          accessTokenExpiresAt: platformModelProviderCredentials.accessTokenExpiresAt,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, credentialId)) as RefreshableCredentialRecord[];
      if (!credential) {
        throw new Error("Platform model provider credential not found.");
      }
      if (credential.type !== "oauth_token") {
        throw new Error("Only OAuth credentials can be refreshed.");
      }

      let refreshedCredential;
      try {
        refreshedCredential = await this.refreshService.refreshCredential({
          accessTokenExpiresAtMilliseconds: credential.accessTokenExpiresAt?.getTime() ?? 0,
          encryptedApiKey: credential.encryptedApiKey,
          id: credential.id,
          modelProvider: credential.modelProvider,
          refreshToken: credential.refreshToken,
        });
      } catch (error) {
        const nextErrorMessage = error instanceof Error ? error.message : "Failed to refresh credential token.";
        await tx
          .update(platformModelProviderCredentials)
          .set({
            status: "error",
            errorMessage: nextErrorMessage,
            updatedAt: new Date(),
          })
          .where(eq(platformModelProviderCredentials.id, credential.id));
        throw error instanceof Error ? error : new Error(nextErrorMessage);
      }
      const refreshedAt = new Date();

      await tx
        .update(platformModelProviderCredentials)
        .set({
          encryptedApiKey: refreshedCredential.access,
          refreshToken: refreshedCredential.refresh,
          accessTokenExpiresAt: new Date(refreshedCredential.expires),
          refreshedAt,
          status: "active",
          errorMessage: null,
          updatedAt: refreshedAt,
        })
        .where(eq(platformModelProviderCredentials.id, credential.id));

      const [updatedCredential] = await tx
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
          updatedAt: platformModelProviderCredentials.updatedAt,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, credential.id)) as PlatformModelProviderCredentialRecord[];
      const models = await tx
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
          credential.id,
        )) as PlatformModelProviderCredentialModelRecord[];
      if (!updatedCredential) {
        throw new Error("Platform model provider credential not found.");
      }

      return this.presenter.serializeCredential(updatedCredential, models);
    });
  };

  private assertPlatformAdmin(context: GraphqlRequestContext): void {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
  }
}
