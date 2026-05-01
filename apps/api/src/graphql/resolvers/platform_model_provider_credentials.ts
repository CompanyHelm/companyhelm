import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { platformModelProviderCredentialModels, platformModelProviderCredentials } from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.ts";
import {
  PlatformModelProviderCredentialRecordPresenter,
  type GraphqlPlatformModelProviderCredentialRecord,
  type PlatformModelProviderCredentialModelRecord,
  type PlatformModelProviderCredentialRecord,
} from "../platform_model_provider_credential_record.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

/**
 * Lists operator-owned LLM credentials for platform admins. This resolver intentionally reads the
 * platform credential tables directly so company credential APIs cannot accidentally expose these
 * records.
 */
@injectable()
export class PlatformModelProviderCredentialsQueryResolver {
  private readonly presenter: PlatformModelProviderCredentialRecordPresenter;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry()) {
    this.presenter = new PlatformModelProviderCredentialRecordPresenter(modelRegistry);
  }

  execute = async (
    _root: unknown,
    _arguments: unknown,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformModelProviderCredentialRecord[]> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }

    return transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const credentials = await tx
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
        .from(platformModelProviderCredentials) as PlatformModelProviderCredentialRecord[];
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
        .from(platformModelProviderCredentialModels) as PlatformModelProviderCredentialModelRecord[];

      return credentials.map((credential) => this.presenter.serializeCredential(credential, models));
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
