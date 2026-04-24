import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentials } from "../../db/schema.ts";
import { CompanyHelmLlmProviderService } from "../../services/ai_providers/companyhelm_service.ts";
import { ImageGenerationModelService } from "../../services/ai_providers/image_generation/model_service.ts";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type RefreshImageProviderCredentialModelsMutationArguments = {
  input: {
    modelProviderCredentialId: string;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  baseUrl: string | null;
  companyId: string;
  modelProvider: ModelProviderId;
  encryptedApiKey: string;
  isManaged: boolean;
};

type GraphqlImageProviderCredentialModelRecord = {
  description: string;
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  name: string;
  outputMimeTypes: string[];
  supportedQualities: string[];
  supportedSizes: string[];
  supportsEditing: boolean;
  supportsFlexibleSizes: boolean;
  supportsTransparentBackground: boolean;
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
 * Refreshes the stored image generation model list for one provider credential.
 */
@injectable()
export class RefreshImageProviderCredentialModelsMutation extends Mutation<
  RefreshImageProviderCredentialModelsMutationArguments,
  GraphqlImageProviderCredentialModelRecord[]
> {
  private readonly companyHelmLlmProviderService?: CompanyHelmLlmProviderService;
  private readonly imageGenerationModelService: ImageGenerationModelService;

  constructor(
    @inject(ImageGenerationModelService) imageGenerationModelService: ImageGenerationModelService,
    @inject(CompanyHelmLlmProviderService)
    companyHelmLlmProviderService?: CompanyHelmLlmProviderService,
  ) {
    super();
    this.imageGenerationModelService = imageGenerationModelService;
    this.companyHelmLlmProviderService = companyHelmLlmProviderService;
  }

  protected resolve = async (
    arguments_: RefreshImageProviderCredentialModelsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlImageProviderCredentialModelRecord[]> => {
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
          baseUrl: modelProviderCredentials.baseUrl,
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

    return this.imageGenerationModelService.refreshStoredModels({
      apiKey,
      baseUrl: credential.baseUrl,
      companyId,
      modelProvider: credential.modelProvider,
      modelProviderCredentialId: credential.id,
      transactionProvider: context.app_runtime_transaction_provider,
    });
  };

  private requireCompanyHelmLlmProviderService(): CompanyHelmLlmProviderService {
    if (!this.companyHelmLlmProviderService) {
      throw new Error("CompanyHelm model provider service is not configured.");
    }

    return this.companyHelmLlmProviderService;
  }
}
