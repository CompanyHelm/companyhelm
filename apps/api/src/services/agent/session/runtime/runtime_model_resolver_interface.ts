import type { SelectableDatabase } from "../session_manager_service_types.ts";

export type RuntimeModelResolverInput = {
  currentModelProviderCredentialModelId: string | null;
  currentModelOptions?: unknown;
};

export type RuntimeModelResolution = {
  apiKey: string;
  baseUrl?: string | null;
  credentialProviderId: string;
  modelId: string;
  modelName?: string | null;
  modelProviderCredentialId: string;
  providerOptions: Record<string, unknown>;
  providerId: string;
  reasoningSupported?: boolean | null;
};

/**
 * Loads the selected session model and credential, then resolves the concrete runtime provider PI
 * Mono should use from the company-provided credential attached to the session.
 */
export interface RuntimeModelResolverInterface {
  /**
   * Resolves one session's current model selection into runtime provider/auth material.
   */
  resolve(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    input: RuntimeModelResolverInput,
  ): Promise<RuntimeModelResolution>;
}
