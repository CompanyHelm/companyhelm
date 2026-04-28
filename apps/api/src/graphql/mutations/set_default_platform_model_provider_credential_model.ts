import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { platformModelProviderCredentialModels } from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.ts";
import {
  PlatformModelProviderCredentialRecordPresenter,
  type GraphqlPlatformModelProviderCredentialModelRecord,
  type PlatformModelProviderCredentialModelRecord,
} from "../platform_model_provider_credential_record.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type SetDefaultPlatformModelProviderCredentialModelMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Promotes a discovered platform model as the default model for its platform credential. This only
 * changes operator metadata and does not affect any company runtime selection yet.
 */
@injectable()
export class SetDefaultPlatformModelProviderCredentialModelMutation extends Mutation<
  SetDefaultPlatformModelProviderCredentialModelMutationArguments,
  GraphqlPlatformModelProviderCredentialModelRecord
> {
  private readonly presenter: PlatformModelProviderCredentialRecordPresenter;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry()) {
    super();
    this.presenter = new PlatformModelProviderCredentialRecordPresenter(modelRegistry);
  }

  protected resolve = async (
    arguments_: SetDefaultPlatformModelProviderCredentialModelMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformModelProviderCredentialModelRecord> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }
    const modelRowId = String(arguments_.input.id || "").trim();
    if (!modelRowId) {
      throw new Error("id is required.");
    }
    const now = new Date();

    return transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const [model] = await tx
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
        .where(eq(platformModelProviderCredentialModels.id, modelRowId)) as PlatformModelProviderCredentialModelRecord[];
      if (!model) {
        throw new Error("Platform credential model not found.");
      }

      await tx
        .update(platformModelProviderCredentialModels)
        .set({
          isDefault: false,
          updatedAt: now,
        })
        .where(eq(
          platformModelProviderCredentialModels.platformModelProviderCredentialId,
          model.platformModelProviderCredentialId,
        ));
      await tx
        .update(platformModelProviderCredentialModels)
        .set({
          isDefault: true,
          updatedAt: now,
        })
        .where(eq(platformModelProviderCredentialModels.id, model.id));

      return this.presenter.serializeModel({
        ...model,
        isDefault: true,
        updatedAt: now,
      });
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
