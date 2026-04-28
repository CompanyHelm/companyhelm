import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PlatformLlmCredentialAccess } from "../../db/platform_llm_credential_access.ts";
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

type SetDefaultPlatformModelProviderCredentialMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Marks one platform credential as the operator default. The default is reserved for later
 * CompanyHelm-managed integration and is not surfaced in company credential lists in this phase.
 */
@injectable()
export class SetDefaultPlatformModelProviderCredentialMutation extends Mutation<
  SetDefaultPlatformModelProviderCredentialMutationArguments,
  GraphqlPlatformModelProviderCredentialRecord
> {
  private readonly presenter: PlatformModelProviderCredentialRecordPresenter;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry()) {
    super();
    this.presenter = new PlatformModelProviderCredentialRecordPresenter(modelRegistry);
  }

  protected resolve = async (
    arguments_: SetDefaultPlatformModelProviderCredentialMutationArguments,
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
    const now = new Date();

    return transactionProvider.transaction(async (tx) => {
      await PlatformLlmCredentialAccess.enable(tx);
      const [credential] = await tx
        .select({
          id: platformModelProviderCredentials.id,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, credentialId)) as Array<{ id: string }>;
      if (!credential) {
        throw new Error("Platform model provider credential not found.");
      }

      await tx
        .update(platformModelProviderCredentials)
        .set({
          isDefault: false,
          updatedAt: now,
        })
        .where(eq(platformModelProviderCredentials.isDefault, true));
      await tx
        .update(platformModelProviderCredentials)
        .set({
          isDefault: true,
          updatedAt: now,
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
          isDefault: platformModelProviderCredentials.isDefault,
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
    if (context.authSession.user.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
  }
}
