import type { ModelProviderModel } from "./model_provider_model.js";

/**
 * Applies collection-level invariants to provider model lists before they are stored or surfaced.
 * Provider APIs can return duplicate model ids, but CompanyHelm treats a model id as the stable
 * choice key for default selection and persistence under a credential.
 */
export class ModelProviderModelCollection {
  static deduplicateByModelId(models: ModelProviderModel[]): ModelProviderModel[] {
    const seenModelIds = new Set<string>();
    const deduplicatedModels: ModelProviderModel[] = [];

    for (const model of models) {
      if (seenModelIds.has(model.modelId)) {
        continue;
      }

      seenModelIds.add(model.modelId);
      deduplicatedModels.push(model);
    }

    return deduplicatedModels;
  }
}
