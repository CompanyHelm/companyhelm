import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.js";
import type {
  GraphqlModelProviderCredentialRecord,
  ModelProviderCredentialModelRecord as ModelRecord,
  ModelProviderCredentialRecord,
} from "../model_provider_credential_record.ts";
import { serializeModelProviderCredentialRecord } from "../model_provider_credential_record.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";
type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Lists model provider credentials for the authenticated company resolved from the bearer token.
 */
@injectable()
export class ModelProviderCredentialsQueryResolver extends Resolver<GraphqlModelProviderCredentialRecord[]> {
  private readonly modelRegistry: ModelRegistry;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry()) {
    super();
    this.modelRegistry = modelRegistry;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlModelProviderCredentialRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const credentials = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          baseUrl: modelProviderCredentials.baseUrl,
          isDefault: modelProviderCredentials.isDefault,
          companyId: modelProviderCredentials.companyId,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          status: modelProviderCredentials.status,
          errorMessage: modelProviderCredentials.errorMessage,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          updatedAt: modelProviderCredentials.updatedAt,
          isManaged: modelProviderCredentials.isManaged,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, companyId)) as ModelProviderCredentialRecord[];
      const modelRecords = await selectableDatabase
        .select({
          isDefault: modelProviderCredentialModels.isDefault,
          modelId: modelProviderCredentialModels.modelId,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(eq(modelProviderCredentialModels.companyId, companyId)) as ModelRecord[];

      return credentials.map((credential) =>
        serializeModelProviderCredentialRecord(this.modelRegistry, credential, modelRecords)
      );
    });
  };
}
