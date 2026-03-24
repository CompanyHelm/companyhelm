import type { ModelProviderModel } from "../../model_service.ts";

/**
 * Transforms a provider-specific models payload into the unified model representation.
 */
export interface ModelAdapterInterface {
  /**
   * Returns provider-specific headers for model fetch requests.
   */
  requestHeaders(apiKey: string): Record<string, string>;
  /**
   * Converts the raw response payload into a normalized list of models.
   * Implementations should validate required fields and throw when malformed.
   */
  adapt(payload: unknown): ModelProviderModel[];
}
