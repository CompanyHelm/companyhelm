import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { platformModelProviderCredentialModels } from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.ts";
import {
  PlatformModelProviderCredentialRecordPresenter,
  type PlatformModelProviderCredentialModelRecord,
} from "../platform_model_provider_credential_record.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

/**
 * Lists the discovered models for one platform credential so admins can inspect and select the
 * default model without exposing platform credential secrets to company-level queries.
 */
@injectable()
export class PlatformModelProviderCredentialModelsQueryResolver {
  private readonly presenter: PlatformModelProviderCredentialRecordPresenter;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry()) {
    this.presenter = new PlatformModelProviderCredentialRecordPresenter(modelRegistry);
  }

  execute = async (
    _root: unknown,
    arguments_: { platformModelProviderCredentialId: string },
    context: GraphqlRequestContext,
  ) => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }
    const credentialId = String(arguments_.platformModelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("platformModelProviderCredentialId is required.");
    }

    return transactionProvider.transaction(async (tx) => {
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
          credentialId,
        )) as PlatformModelProviderCredentialModelRecord[];

      return models.map((model) => this.presenter.serializeModel(model));
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
