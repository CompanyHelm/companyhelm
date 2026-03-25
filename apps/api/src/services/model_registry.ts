import { injectable } from "inversify";
import { ModelProviderModel } from "./model_provider_model.ts";

/**
 * Owns the curated catalog of provider models the product recognizes so reasoning metadata and
 * naming stay stable even when upstream provider payloads are inconsistent or sparse.
 */
@injectable()
export class ModelRegistry {
  private static readonly OPENAI_REASONING_LEVELS = ["low", "medium", "high", "xhigh"];

  private readonly models: ModelProviderModel[] = [
    new ModelProviderModel({
      provider: "openai",
      name: "gpt-5.4",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      name: "gpt-5.4-codex",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      name: "gpt-5.4-codex-spark",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      name: "gpt-5.3",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      name: "gpt-5.3-codex",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      name: "gpt-5.3-codex-spark",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "anthropic",
      name: "claude-opus-4-6",
    }),
    new ModelProviderModel({
      provider: "anthropic",
      name: "claude-sonnet-4-6",
    }),
    new ModelProviderModel({
      provider: "anthropic",
      name: "claude-haiku-4-5",
    }),
  ];

  /**
   * Returns the curated models for one provider while preserving their explicit order so UI lists
   * and downstream persistence stay deterministic across requests.
   */
  getModelsForProvider(provider: string): ModelProviderModel[] {
    const normalizedProvider = String(provider || "").trim();
    if (!normalizedProvider) {
      throw new Error("Model provider is required.");
    }

    return this.models.filter((model) => model.provider === normalizedProvider);
  }
}
