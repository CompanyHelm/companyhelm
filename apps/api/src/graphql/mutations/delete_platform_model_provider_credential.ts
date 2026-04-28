import { eq } from "drizzle-orm";
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
import { Mutation } from "./mutation.ts";

type DeletePlatformModelProviderCredentialMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Removes one platform LLM credential and its discovered model rows. There are no runtime
 * references yet, so deletion does not need replacement handling until platform credentials are
 * wired into CompanyHelm-managed model selection.
 */
@injectable()
export class DeletePlatformModelProviderCredentialMutation extends Mutation<
  DeletePlatformModelProviderCredentialMutationArguments,
  GraphqlPlatformModelProviderCredentialRecord
> {
  private readonly presenter: PlatformModelProviderCredentialRecordPresenter;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry()) {
    super();
    this.presenter = new PlatformModelProviderCredentialRecordPresenter(modelRegistry);
  }

  protected resolve = async (
    arguments_: DeletePlatformModelProviderCredentialMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformModelProviderCredentialRecord> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }
    const credentialId = String(arguments_.input.id || "").trim();
    if (!credentialId) {
      throw new Error("id is required.");
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
          isDefault: platformModelProviderCredentials.isDefault,
          updatedAt: platformModelProviderCredentials.updatedAt,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, credentialId)) as PlatformModelProviderCredentialRecord[];
      if (!credential) {
        throw new Error("Platform model provider credential not found.");
      }
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

      await tx
        .delete(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, credential.id));

      return this.presenter.serializeCredential(credential, models);
    });
  };

  private assertPlatformAdmin(context: GraphqlRequestContext): void {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    if (context.authSession.user.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
  }
}
