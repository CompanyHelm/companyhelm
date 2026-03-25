import { injectable } from "inversify";
import { ModelProviderModel } from "./model_provider_model.js";

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
      modelId: "gpt-5.4",
      name: "GPT-5.4",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5-codex",
      name: "GPT-5 Codex",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.2-codex",
      name: "GPT-5.2 Codex",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.1-codex",
      name: "GPT-5.1 Codex",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.3-codex",
      name: "GPT-5.3 Codex",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.1-codex-max",
      name: "GPT-5.1 Codex Max",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "anthropic",
      modelId: "claude-opus-4-6",
      name: "Claude Opus 4.6",
    }),
    new ModelProviderModel({
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
    }),
    new ModelProviderModel({
      provider: "anthropic",
      modelId: "claude-haiku-4-5",
      name: "Claude Haiku 4.5",
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
