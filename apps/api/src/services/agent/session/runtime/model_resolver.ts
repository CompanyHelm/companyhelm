import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../../../db/platform_admin_access.ts";
import {
  modelProviderCredentialModels,
  modelProviderCredentials,
  platformModelProviderCredentialModels,
  platformModelProviderCredentials,
} from "../../../../db/schema.ts";
import type { SelectableDatabase } from "../session_manager_service_types.ts";
import { RuntimeProviderAdapterRegistry } from "./provider_adapter_registry.ts";
import type {
  RuntimeModelResolution,
  RuntimeModelResolverInput,
  RuntimeModelResolverInterface,
} from "./runtime_model_resolver_interface.ts";

type ModelRow = {
  modelId: string;
  modelProviderCredentialId: string | null;
  name?: string;
  platformModelProviderCredentialId: string | null;
  reasoningSupported?: boolean;
};

type CredentialRow = {
  baseUrl: string | null;
  encryptedApiKey: string;
  modelProvider: string;
};

/**
 * Resolves the persisted session model selection into the concrete provider, model, and API key
 * required by PI Mono. Platform sessions use the selected route credential; CompanyHelm remains a
 * product/provider label unless a legacy credential row still stores it as the concrete provider.
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
    const [modelRow] = input.currentModelCredentialSource === "platform"
      ? await this.loadPlatformModelRow(
        selectableDatabase,
        input.currentPlatformModelProviderCredentialModelId ?? "",
      )
      : await this.loadUserProvidedModelRow(
        selectableDatabase,
        companyId,
        input.currentModelProviderCredentialModelId ?? "",
      );
    if (!modelRow) {
      throw new Error("Session model not found.");
    }

    const [credentialRow] = input.currentModelCredentialSource === "platform"
      ? await this.loadPlatformCredentialRow(selectableDatabase, modelRow.platformModelProviderCredentialId ?? "")
      : await this.loadUserProvidedCredentialRow(selectableDatabase, companyId, modelRow.modelProviderCredentialId ?? "");
    if (!credentialRow) {
      throw new Error("Session credential not found.");
    }

    const runtimeProvider = this.runtimeProviderAdapterRegistry.resolve(credentialRow.modelProvider, {
      apiKey: credentialRow.encryptedApiKey,
      baseUrl: credentialRow.baseUrl,
      modelId: modelRow.modelId,
    });
    const resolvedCredentialId = modelRow.platformModelProviderCredentialId ?? modelRow.modelProviderCredentialId;

    return {
      apiKey: runtimeProvider.apiKey,
      ...(runtimeProvider.baseUrl ? { baseUrl: runtimeProvider.baseUrl } : {}),
      credentialProviderId: credentialRow.modelProvider,
      modelId: modelRow.modelId,
      ...(modelRow.name ? { modelName: modelRow.name } : {}),
      modelProviderCredentialId: resolvedCredentialId ?? "",
      providerId: runtimeProvider.providerId,
      ...(typeof modelRow.reasoningSupported === "boolean" ? { reasoningSupported: modelRow.reasoningSupported } : {}),
    };
  }

  private async loadPlatformModelRow(
    selectableDatabase: SelectableDatabase,
    platformModelProviderCredentialModelId: string,
  ): Promise<ModelRow[]> {
    await PlatformAdminAccess.enable(selectableDatabase);
    return selectableDatabase
      .select({
        modelId: platformModelProviderCredentialModels.modelId,
        platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
        name: platformModelProviderCredentialModels.name,
        reasoningSupported: platformModelProviderCredentialModels.reasoningSupported,
      })
      .from(platformModelProviderCredentialModels)
      .where(eq(platformModelProviderCredentialModels.id, platformModelProviderCredentialModelId)) as Promise<ModelRow[]>;
  }

  private async loadPlatformCredentialRow(
    selectableDatabase: SelectableDatabase,
    platformModelProviderCredentialId: string,
  ): Promise<CredentialRow[]> {
    await PlatformAdminAccess.enable(selectableDatabase);
    return selectableDatabase
      .select({
        baseUrl: platformModelProviderCredentials.baseUrl,
        encryptedApiKey: platformModelProviderCredentials.encryptedApiKey,
        modelProvider: platformModelProviderCredentials.modelProvider,
      })
      .from(platformModelProviderCredentials)
      .where(eq(platformModelProviderCredentials.id, platformModelProviderCredentialId)) as Promise<CredentialRow[]>;
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
