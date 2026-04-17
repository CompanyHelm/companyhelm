import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.js";
import {
  LlmOauthCredentialRefreshService,
} from "../../services/ai_providers/llm_oauth_credential_refresh_service.ts";
import type { GraphqlModelProviderCredentialRecord } from "../model_provider_credential_record.ts";
import {
  serializeModelProviderCredentialRecord,
  type ModelProviderCredentialModelRecord,
  type ModelProviderCredentialRecord,
} from "../model_provider_credential_record.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type RefreshModelProviderCredentialTokenMutationArguments = {
  input: {
    modelProviderCredentialId: string;
  };
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<Array<Record<string, unknown>>>;
      };
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

type RefreshableCredentialRecord = ModelProviderCredentialRecord & {
  encryptedApiKey: string;
  accessTokenExpiresAt: Date | null;
};

@injectable()
export class RefreshModelProviderCredentialTokenMutation extends Mutation<
  RefreshModelProviderCredentialTokenMutationArguments,
  GraphqlModelProviderCredentialRecord
> {
  private readonly modelRegistry: ModelRegistry;
  private readonly refreshService: LlmOauthCredentialRefreshService;

  constructor(
    @inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry(),
    @inject(LlmOauthCredentialRefreshService)
    refreshService: LlmOauthCredentialRefreshService = new LlmOauthCredentialRefreshService(),
  ) {
    super();
    this.modelRegistry = modelRegistry;
    this.refreshService = refreshService;
  }

  protected resolve = async (
    arguments_: RefreshModelProviderCredentialTokenMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlModelProviderCredentialRecord> => {
    const credentialId = String(arguments_.input.modelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("modelProviderCredentialId is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      const [credential] = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          status: modelProviderCredentials.status,
          errorMessage: modelProviderCredentials.errorMessage,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          isDefault: modelProviderCredentials.isDefault,
          isManaged: modelProviderCredentials.isManaged,
          updatedAt: modelProviderCredentials.updatedAt,
          encryptedApiKey: modelProviderCredentials.encryptedApiKey,
          accessTokenExpiresAt: modelProviderCredentials.accessTokenExpiresAt,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, credentialId),
        ))
        .limit(1) as RefreshableCredentialRecord[];

      if (!credential) {
        throw new Error("Credential not found.");
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
        await updatableDatabase
          .update(modelProviderCredentials)
          .set({
            status: "error",
            errorMessage: nextErrorMessage,
            updatedAt: new Date(),
          })
          .where(and(
            eq(modelProviderCredentials.companyId, companyId),
            eq(modelProviderCredentials.id, credential.id),
          ));
        throw error instanceof Error ? error : new Error(nextErrorMessage);
      }
      const refreshedAt = new Date();

      await updatableDatabase
        .update(modelProviderCredentials)
        .set({
          encryptedApiKey: refreshedCredential.access,
          refreshToken: refreshedCredential.refresh,
          accessTokenExpiresAt: new Date(refreshedCredential.expires),
          refreshedAt,
          status: "active",
          errorMessage: null,
          updatedAt: refreshedAt,
        })
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, credential.id),
        ));

      const [updatedCredential] = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          status: modelProviderCredentials.status,
          errorMessage: modelProviderCredentials.errorMessage,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          isDefault: modelProviderCredentials.isDefault,
          isManaged: modelProviderCredentials.isManaged,
          updatedAt: modelProviderCredentials.updatedAt,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, credential.id),
        ))
        .limit(1) as ModelProviderCredentialRecord[];

      if (!updatedCredential) {
        throw new Error("Credential not found.");
      }

      const models = await selectableDatabase
        .select({
          isDefault: modelProviderCredentialModels.isDefault,
          modelId: modelProviderCredentialModels.modelId,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, companyId),
          eq(modelProviderCredentialModels.modelProviderCredentialId, credential.id),
        ))
        .limit(1000) as ModelProviderCredentialModelRecord[];

      return serializeModelProviderCredentialRecord(this.modelRegistry, updatedCredential, models);
    });
  };
}
