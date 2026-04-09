import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentials } from "../../db/schema.ts";
import { ModelService } from "../../services/ai_providers/model_service.js";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type RefreshModelProviderCredentialModelsMutationArguments = {
  input: {
    modelProviderCredentialId: string;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  modelProvider: ModelProviderId;
  encryptedApiKey: string;
};

type GraphqlModelProviderCredentialModelRecord = {
  id: string;
  isDefault: boolean;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  description: string;
  reasoningLevels: string[];
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<ModelProviderCredentialRecord[]>;
      };
    };
  };
};

/**
 * Refreshes the stored model list for a provider credential.
 */
@injectable()
export class RefreshModelProviderCredentialModelsMutation extends Mutation<
  RefreshModelProviderCredentialModelsMutationArguments,
  GraphqlModelProviderCredentialModelRecord[]
> {
  private readonly modelService: ModelService;

  constructor(@inject(ModelService) modelService: ModelService) {
    super();
    this.modelService = modelService;
  }

  protected resolve = async (
    arguments_: RefreshModelProviderCredentialModelsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlModelProviderCredentialModelRecord[]> => {
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

    const [credential] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          modelProvider: modelProviderCredentials.modelProvider,
          encryptedApiKey: modelProviderCredentials.encryptedApiKey,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, context.authSession.company.id),
          eq(modelProviderCredentials.id, credentialId),
        ))
        .limit(1);
    });

    if (!credential) {
      throw new Error("Credential not found.");
    }

    const updatedModels = await this.modelService.refreshStoredModels({
      apiKey: credential.encryptedApiKey,
      companyId: context.authSession.company.id,
      modelProvider: credential.modelProvider,
      modelProviderCredentialId: credential.id,
      transactionProvider: context.app_runtime_transaction_provider,
    });

    return updatedModels.map((model) => ({
      ...model,
      reasoningLevels: model.reasoningLevels ?? [],
    }));
  };
}
