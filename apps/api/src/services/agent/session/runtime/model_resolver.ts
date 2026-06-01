import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../../../../db/schema.ts";
import type { SelectableDatabase } from "../session_manager_service_types.ts";
import { ModelOptionSelection } from "../../../ai_providers/model_option_selection.ts";
import { RuntimeProviderAdapterRegistry } from "./provider_adapter_registry.ts";
import type {
  RuntimeModelResolution,
  RuntimeModelResolverInput,
  RuntimeModelResolverInterface,
} from "./runtime_model_resolver_interface.ts";

type ModelRow = {
  modelId: string;
  modelProviderCredentialId: string;
  name?: string;
  reasoningSupported?: boolean;
  modelOptions: unknown;
};

type CredentialRow = {
  baseUrl: string | null;
  encryptedApiKey: string;
  modelProvider: string;
};

/**
 * Resolves the persisted session model selection into the concrete company-provided provider,
 * model, and API key required by PI Mono.
 */
@injectable()
export class RuntimeModelResolver implements RuntimeModelResolverInterface {
  private readonly runtimeProviderAdapterRegistry: RuntimeProviderAdapterRegistry;

  constructor(
    @inject(RuntimeProviderAdapterRegistry)
    runtimeProviderAdapterRegistry: RuntimeProviderAdapterRegistry = new RuntimeProviderAdapterRegistry(),
  ) {
    this.runtimeProviderAdapterRegistry = runtimeProviderAdapterRegistry;
  }

  async resolve(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    input: RuntimeModelResolverInput,
  ): Promise<RuntimeModelResolution> {
    const [modelRow] = await this.loadUserProvidedModelRow(
      selectableDatabase,
      companyId,
      input.currentModelProviderCredentialModelId ?? "",
    );
    if (!modelRow) {
      throw new Error("Session model not found.");
    }

    const [credentialRow] = await this.loadUserProvidedCredentialRow(
      selectableDatabase,
      companyId,
      modelRow.modelProviderCredentialId,
    );
    if (!credentialRow) {
      throw new Error("Session credential not found.");
    }

    const runtimeProvider = this.runtimeProviderAdapterRegistry.resolve(credentialRow.modelProvider, {
      apiKey: credentialRow.encryptedApiKey,
      baseUrl: credentialRow.baseUrl,
      modelId: modelRow.modelId,
    });

    return {
      apiKey: runtimeProvider.apiKey,
      ...(runtimeProvider.baseUrl ? { baseUrl: runtimeProvider.baseUrl } : {}),
      credentialProviderId: credentialRow.modelProvider,
      modelId: modelRow.modelId,
      ...(modelRow.name ? { modelName: modelRow.name } : {}),
      modelProviderCredentialId: modelRow.modelProviderCredentialId,
      providerOptions: ModelOptionSelection.normalizeSelectedValues(
        ModelOptionSelection.normalizeDefinitions(modelRow.modelOptions),
        input.currentModelOptions,
      ),
      providerId: runtimeProvider.providerId,
      ...(typeof modelRow.reasoningSupported === "boolean" ? { reasoningSupported: modelRow.reasoningSupported } : {}),
    };
  }

  private async loadUserProvidedModelRow(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    modelProviderCredentialModelId: string,
  ): Promise<ModelRow[]> {
    return selectableDatabase
      .select({
        modelId: modelProviderCredentialModels.modelId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        name: modelProviderCredentialModels.name,
        reasoningSupported: modelProviderCredentialModels.reasoningSupported,
        modelOptions: modelProviderCredentialModels.modelOptions,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.id, modelProviderCredentialModelId),
      )) as Promise<ModelRow[]>;
  }

  private async loadUserProvidedCredentialRow(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    modelProviderCredentialId: string,
  ): Promise<CredentialRow[]> {
    return selectableDatabase
      .select({
        baseUrl: modelProviderCredentials.baseUrl,
        encryptedApiKey: modelProviderCredentials.encryptedApiKey,
        modelProvider: modelProviderCredentials.modelProvider,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.id, modelProviderCredentialId),
      )) as Promise<CredentialRow[]>;
  }
}
