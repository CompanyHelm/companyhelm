import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { CompanyHelmLlmProviderService } from "../../services/ai_providers/companyhelm_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type ModelProviderCredentialModelsArguments = {
  modelProviderCredentialId: string;
};

type ModelProviderCredentialModelRecord = {
  id: string;
  isDefault: boolean;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  description: string;
  reasoningSupported: boolean;
  reasoningLevels: string[] | null;
};

type ModelProviderCredentialRecord = {
  id: string;
  isManaged: boolean;
  modelProvider: string;
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
      where(condition: unknown): Promise<ModelProviderCredentialModelRecord[]>;
    };
  };
};

/**
 * Lists model metadata for a single provider credential.
 */
@injectable()
export class ModelProviderCredentialModelsQueryResolver {
  constructor(
    @inject(CompanyHelmLlmProviderService)
    private readonly companyHelmLlmProviderService: Pick<
      CompanyHelmLlmProviderService,
      "getSeedModels" | "matchesCredential"
    > = {
      getSeedModels() {
        return [];
      },
      matchesCredential() {
        return false;
      },
    },
  ) {}

  execute = async (
    _root: unknown,
    arguments_: ModelProviderCredentialModelsArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlModelProviderCredentialModelRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const credentialId = String(arguments_.modelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("modelProviderCredentialId is required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const [credential] = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          isManaged: modelProviderCredentials.isManaged,
          modelProvider: modelProviderCredentials.modelProvider,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, credentialId),
        )) as unknown as ModelProviderCredentialRecord[];
      if (!credential) {
        throw new Error("Credential not found.");
      }

      const models = await selectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          isDefault: modelProviderCredentialModels.isDefault,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          modelId: modelProviderCredentialModels.modelId,
          name: modelProviderCredentialModels.name,
          description: modelProviderCredentialModels.description,
          reasoningSupported: modelProviderCredentialModels.reasoningSupported,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, companyId),
          eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
        ));

      const allowedManagedModelIds = this.companyHelmLlmProviderService.matchesCredential(credential)
        ? new Set(this.companyHelmLlmProviderService.getSeedModels().map((model) => model.modelId))
        : null;
      const visibleModels = allowedManagedModelIds
        ? models.filter((model) => allowedManagedModelIds.has(model.modelId))
        : models;

      return visibleModels.map((model) => ({
        ...model,
        reasoningSupported: model.reasoningSupported,
        reasoningLevels: model.reasoningLevels ?? [],
      }));
    });
  };
}
