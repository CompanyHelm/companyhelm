import type { ModelProviderModel } from "../../model_service.ts";

/**
 * Transforms a provider-specific models payload into the unified model representation.
 */
export interface ModelAdapterInterface {
  /**
   * Converts the raw response payload into a normalized list of models.
   * Implementations should validate required fields and throw when malformed.
   */
  adapt(payload: unknown): ModelProviderModel[];
}
