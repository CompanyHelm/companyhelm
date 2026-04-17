import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentials } from "../../db/schema.ts";
import { CompanyHelmLlmProviderService } from "../../services/ai_providers/companyhelm_service.ts";
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
  isManaged: boolean;
};

type GraphqlModelProviderCredentialModelRecord = {
  id: string;
  isDefault: boolean;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  description: string;
  reasoningSupported: boolean;
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
  private readonly companyHelmLlmProviderService?: CompanyHelmLlmProviderService;
  private readonly modelService: ModelService;

  constructor(
    @inject(ModelService) modelService: ModelService,
    @inject(CompanyHelmLlmProviderService)
    companyHelmLlmProviderService?: CompanyHelmLlmProviderService,
  ) {
    super();
    this.modelService = modelService;
    this.companyHelmLlmProviderService = companyHelmLlmProviderService;
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
    const companyId = context.authSession.company.id;

    const [credential] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      return selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          modelProvider: modelProviderCredentials.modelProvider,
          encryptedApiKey: modelProviderCredentials.encryptedApiKey,
          isManaged: modelProviderCredentials.isManaged,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, credentialId),
        ))
        .limit(1);
    });

    if (!credential) {
      throw new Error("Credential not found.");
    }
    const apiKey = credential.isManaged
      ? this.requireCompanyHelmLlmProviderService().getRuntimeApiKey()
      : credential.encryptedApiKey;

    const updatedModels = await this.modelService.refreshStoredModels({
      apiKey,
      companyId,
      modelProvider: credential.modelProvider,
      modelProviderCredentialId: credential.id,
      transactionProvider: context.app_runtime_transaction_provider,
    });

    return updatedModels.map((model) => ({
      ...model,
      reasoningSupported: model.reasoningSupported,
      reasoningLevels: model.reasoningLevels ?? [],
    }));
  };

  private requireCompanyHelmLlmProviderService(): CompanyHelmLlmProviderService {
    if (!this.companyHelmLlmProviderService) {
      throw new Error("CompanyHelm model provider service is not configured.");
    }

    return this.companyHelmLlmProviderService;
  }
}
