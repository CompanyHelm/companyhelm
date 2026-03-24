import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { modelProviderCredentials } from "../../db/schema.ts";
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
  modelProvider: "openai";
  type: "api_key";
  refreshToken: string | null;
  refreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: "openai";
  type: "api_key";
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
      const deletableDatabase = tx as DeletableDatabase;
      return deletableDatabase
        .delete(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, context.authSession.company.id),
          eq(modelProviderCredentials.id, credentialId),
        ))
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
        }) as Promise<ModelProviderCredentialRecord[]>;
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
