import { injectable } from "inversify";
import { ModelProviderModel } from "./model_provider_model.js";

/**
 * Owns the curated model catalog that CompanyHelm recognizes across providers. Its scope is
 * keeping model names, descriptions, reasoning metadata, and provider defaults stable even when
 * upstream provider APIs return inconsistent or incomplete model payloads.
 */
@injectable()
export class ModelRegistry {
  private static readonly OPENAI_REASONING_LEVELS = ["low", "medium", "high", "xhigh"];

  private static defaultModels: Record<string, string> = {
    openai: "gpt-5.4",
    "openai-codex": "gpt-5.4",
    anthropic: "claude-opus-4-6",
    openrouter: "openrouter/auto",
    "google-gemini-cli": "gemini-3.1-pro-preview",
  };

  private static defaultReasoningLevels: Record<string, string> = {
    openai: "high",
    "openai-codex": "high",
    "google-gemini-cli": "high",
  };


  private readonly models: ModelProviderModel[] = [
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.4",
      name: "GPT-5.4",
      description: "Latest frontier agentic coding model.",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.4-mini",
      name: "GPT-5.4 Mini",
      description: "Smaller frontier agentic coding model.",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.3-codex",
      name: "GPT-5.3 Codex",
      description: "Frontier Codex-optimized agentic coding model.",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.3-codex-spark",
      name: "GPT-5.3 Codex Spark",
      description: "Ultra-fast coding model.",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.2-codex",
      name: "GPT-5.2 Codex",
      description: "Frontier agentic coding model.",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.2",
      name: "GPT-5.2",
      description: "Optimized for professional work and long-running agents",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.1-codex-max",
      name: "GPT-5.1 Codex Max",
      description: "Codex-optimized model for deep and fast reasoning.",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "openai",
      modelId: "gpt-5.1-codex-mini",
      name: "GPT-5.1 Codex Mini",
      description: "Optimized for codex. Cheaper, faster, but less capable.",
      reasoningLevels: ModelRegistry.OPENAI_REASONING_LEVELS,
    }),
    new ModelProviderModel({
      provider: "anthropic",
      modelId: "claude-opus-4-6",
      name: "Claude Opus 4.6",
      description: "Opus 4.6 · Most capable for complex work",
    }),
    new ModelProviderModel({
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      description: "Sonnet 4.6 · Best for everyday tasks",
    }),
    new ModelProviderModel({
      provider: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      name: "Claude Haiku 4.5",
      description: "Haiku 4.5 · Fastest for quick answers",
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

  getDefaultModelForProvider(provider: string): string | null {
    return ModelRegistry.defaultModels[provider] ?? null;
  }

  getDefaultReasoningLevelForProvider(provider: string): string | null {
    return ModelRegistry.defaultReasoningLevels[provider] ?? null;
  }
}
