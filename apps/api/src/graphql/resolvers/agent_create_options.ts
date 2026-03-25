import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type CredentialRecord = {
  id: string;
  modelProvider: "openai" | "anthropic";
  name: string;
};

type ModelRecord = {
  id: string;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  description: string;
  reasoningLevels: string[] | null;
};

type GraphqlAgentCreateModelOption = {
  id: string;
  modelId: string;
  name: string;
  description: string;
  reasoningLevels: string[];
};

type GraphqlAgentCreateProviderOption = {
  id: string;
  label: string;
  modelProvider: "openai" | "anthropic";
  models: GraphqlAgentCreateModelOption[];
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Lists provider/model combinations that can be used when creating an agent, grouped by credential
 * so the UI can render provider and model dropdowns without additional round-trips.
 */
@injectable()
export class AgentCreateOptionsQueryResolver extends Resolver<GraphqlAgentCreateProviderOption[]> {
  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlAgentCreateProviderOption[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const credentialRecords = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          modelProvider: modelProviderCredentials.modelProvider,
          name: modelProviderCredentials.name,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, context.authSession.company.id)) as CredentialRecord[];

      const modelRecords = await selectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          modelId: modelProviderCredentialModels.modelId,
          name: modelProviderCredentialModels.name,
          description: modelProviderCredentialModels.description,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(eq(modelProviderCredentialModels.companyId, context.authSession.company.id)) as ModelRecord[];

      return credentialRecords
        .map((credentialRecord) => {
          const credentialModels = modelRecords
            .filter((modelRecord) => modelRecord.modelProviderCredentialId === credentialRecord.id)
            .map((modelRecord) => ({
              id: modelRecord.id,
              modelId: modelRecord.modelId,
              name: modelRecord.name,
              description: modelRecord.description,
              reasoningLevels: modelRecord.reasoningLevels ?? [],
            }));

          return {
            id: credentialRecord.id,
            label: AgentCreateOptionsQueryResolver.resolveProviderLabel(credentialRecord),
            modelProvider: credentialRecord.modelProvider,
            models: credentialModels,
          };
        })
        .filter((providerOption) => providerOption.models.length > 0);
    });
  };

  private static resolveProviderLabel(credentialRecord: CredentialRecord): string {
    if (credentialRecord.modelProvider === "openai" && credentialRecord.name === "OpenAI / Codex") {
      return "OpenAI / Codex";
    }

    if (credentialRecord.modelProvider === "anthropic" && credentialRecord.name === "Anthropic") {
      return "Anthropic";
    }

    return `${credentialRecord.name} (${credentialRecord.modelProvider})`;
  }
}
