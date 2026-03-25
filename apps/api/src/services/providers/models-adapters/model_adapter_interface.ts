import type { ModelProviderModel } from "../../model_provider_model.ts";

/**
 * Defines how one provider validates access and returns the normalized models that the rest of the
 * application can persist without knowing provider-specific transport details.
 */
export interface ModelAdapterInterface {
  /**
   * Fetches the provider catalog using the given credential and returns the normalized models that
   * the application should expose after provider-specific validation succeeds.
   */
  fetchModels(apiKey: string): Promise<ModelProviderModel[]>;
}
