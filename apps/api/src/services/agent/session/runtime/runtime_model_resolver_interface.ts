import type { SelectableDatabase } from "../session_manager_service_types.ts";

export type RuntimeModelResolverInput = {
  currentModelCredentialSource: "platform" | "user_provided";
  currentModelProviderCredentialModelId: string | null;
  currentPlatformModelId: string | null;
  currentPlatformModelProviderCredentialModelId: string | null;
};

export type RuntimeModelResolution = {
  apiKey: string;
  baseUrl?: string | null;
  credentialProviderId: string;
  modelId: string;
  modelName?: string | null;
  modelProviderCredentialId: string;
  providerId: string;
  reasoningSupported?: boolean | null;
};

/**
 * Loads the selected session model and credential, then resolves the concrete runtime provider PI
 * Mono should use. The session keeps product-facing platform model state; this boundary turns it
 * into executable auth and provider details.
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
