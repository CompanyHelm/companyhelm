import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { modelProviderCredentials } from "../../db/schema.ts";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteModelProviderCredentialMutationArguments = {
  input: {
    id: string;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: ModelProviderId;
  isDefault: boolean;
  type: "api_key" | "oauth_token";
  refreshToken: string | null;
  refreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: ModelProviderId;
  type: "api_key" | "oauth_token";
  refreshToken: string | null;
  refreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): {
      returning?(selection?: Record<string, unknown>): Promise<ModelProviderCredentialRecord[]>;
    };
  };
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<ModelProviderCredentialRecord[]>;
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
 * Deletes a model provider credential for the authenticated company.
 */
@injectable()
export class DeleteModelProviderCredentialMutation extends Mutation<
  DeleteModelProviderCredentialMutationArguments,
  GraphqlModelProviderCredentialRecord
> {
  protected resolve = async (
    arguments_: DeleteModelProviderCredentialMutationArguments,
    context: GraphqlRequestContext,
  ) => {
    const credentialId = String(arguments_.input.id || "").trim();
    if (!credentialId) {
      throw new Error("id is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const [credential] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const deletedCredentials = await deletableDatabase
        .delete(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, context.authSession.company.id),
          eq(modelProviderCredentials.id, credentialId),
        ))
        .returning?.({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          isDefault: modelProviderCredentials.isDefault,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          updatedAt: modelProviderCredentials.updatedAt,
        }) as Promise<ModelProviderCredentialRecord[]>;
      const deletedCredential = deletedCredentials[0];
      if (deletedCredential?.isDefault) {
        const remainingCredentials = await selectableDatabase
          .select({
            id: modelProviderCredentials.id,
            companyId: modelProviderCredentials.companyId,
            isDefault: modelProviderCredentials.isDefault,
            name: modelProviderCredentials.name,
            modelProvider: modelProviderCredentials.modelProvider,
            type: modelProviderCredentials.type,
            refreshToken: modelProviderCredentials.refreshToken,
            refreshedAt: modelProviderCredentials.refreshedAt,
            createdAt: modelProviderCredentials.createdAt,
            updatedAt: modelProviderCredentials.updatedAt,
          })
          .from(modelProviderCredentials)
          .where(eq(modelProviderCredentials.companyId, context.authSession.company.id));
        const fallbackCredential = [...remainingCredentials]
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
          .at(0);
        if (fallbackCredential) {
          await updatableDatabase
            .update(modelProviderCredentials)
            .set({
              isDefault: false,
            })
            .where(eq(modelProviderCredentials.companyId, context.authSession.company.id));
          await updatableDatabase
            .update(modelProviderCredentials)
            .set({
              isDefault: true,
            })
            .where(and(
              eq(modelProviderCredentials.companyId, context.authSession.company.id),
              eq(modelProviderCredentials.id, fallbackCredential.id),
            ));
        }
      }

      return deletedCredentials;
    });

    if (!credential) {
      throw new Error("Credential not found.");
    }

    return {
      ...credential,
      refreshedAt: credential.refreshedAt?.toISOString() ?? null,
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
    };
  };
}
