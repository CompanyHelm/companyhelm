export type RuntimeProviderResolution = {
  apiKey: string;
  baseUrl?: string | null;
  providerId: string;
};

export type RuntimeProviderAdapterInput = {
  apiKey: string;
  baseUrl?: string | null;
  modelId: string;
};

/**
 * Converts a stored credential provider into the provider identity and auth material PI Mono
 * expects. This is deliberately runtime-only: catalog discovery can stay independent from session
 * route and credential semantics.
 */
export interface RuntimeProviderAdapterInterface {
  /**
   * Returns the PI Mono provider id and auth material for a concrete credential provider.
   */
  resolve(input: RuntimeProviderAdapterInput): RuntimeProviderResolution;
}
