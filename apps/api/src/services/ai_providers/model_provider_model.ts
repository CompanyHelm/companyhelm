export type ModelProviderOptionValue = string | number | boolean | null;

export type ModelProviderOptionChoice = {
  readonly name: string;
  readonly value: ModelProviderOptionValue;
  readonly description?: string;
};

export type ModelProviderOptionDefinition = {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly type: "select" | "number" | "text" | "boolean";
  readonly category: string;
  readonly defaultValue?: ModelProviderOptionValue;
  readonly options?: readonly ModelProviderOptionChoice[];
};

export type ModelProviderOptionValues = Record<string, ModelProviderOptionValue>;

const MODEL_PROVIDER_OPTION_TYPES = new Set(["select", "number", "text", "boolean"]);

/**
 * Represents a single provider model that can be surfaced to product features while carrying
 * optional reasoning metadata and generic provider option definitions used by the UI and runtime.
 */
export class ModelProviderModel {
  readonly provider: string;
  readonly modelId: string;
  readonly name: string;
  readonly description: string;
  readonly contextWindowTokens: number | null;
  readonly reasoningSupported: boolean;
  readonly reasoningLevels: string[] | null;
  readonly modelOptions: ModelProviderOptionDefinition[];

  constructor(input: {
    provider: string;
    modelId: string;
    name: string;
    description: string;
    contextWindowTokens?: number | null;
    modelOptions?: readonly ModelProviderOptionDefinition[] | null;
    reasoningSupported?: boolean;
    reasoningLevels?: string[] | null;
  }) {
    const normalizedProvider = String(input.provider || "").trim();
    const normalizedModelId = String(input.modelId || "").trim();
    const normalizedName = String(input.name || "").trim();
    const normalizedDescription = String(input.description || "").trim();
    if (!normalizedProvider) {
      throw new Error("Model provider is required.");
    }
    if (!normalizedModelId) {
      throw new Error("Model id is required.");
    }
    if (!normalizedName) {
      throw new Error("Model name is required.");
    }
    if (!normalizedDescription) {
      throw new Error("Model description is required.");
    }

    this.provider = normalizedProvider;
    this.modelId = normalizedModelId;
    this.name = normalizedName;
    this.description = normalizedDescription;
    this.contextWindowTokens = typeof input.contextWindowTokens === "number"
      && Number.isFinite(input.contextWindowTokens)
      && input.contextWindowTokens > 0
      ? Math.trunc(input.contextWindowTokens)
      : null;
    this.reasoningLevels = Array.isArray(input.reasoningLevels) && input.reasoningLevels.length > 0
      ? input.reasoningLevels.map((level) => String(level || "").trim()).filter((level) => level.length > 0)
      : null;
    this.reasoningSupported = typeof input.reasoningSupported === "boolean"
      ? input.reasoningSupported
      : this.reasoningLevels !== null;
    this.modelOptions = this.normalizeModelOptions(input.modelOptions ?? []);
  }

  private normalizeModelOptions(
    modelOptions: readonly ModelProviderOptionDefinition[],
  ): ModelProviderOptionDefinition[] {
    return modelOptions
      .map((option) => ({
        ...option,
        category: String(option.category || "advanced").trim(),
        description: String(option.description || "").trim(),
        key: String(option.key || "").trim(),
        name: String(option.name || "").trim(),
        options: option.options?.map((choice) => ({
          ...choice,
          description: choice.description ? String(choice.description).trim() : undefined,
          name: String(choice.name || "").trim(),
        })).filter((choice) => choice.name.length > 0),
      }))
      .filter((option) => option.key.length > 0
        && option.name.length > 0
        && option.description.length > 0
        && MODEL_PROVIDER_OPTION_TYPES.has(option.type));
  }
}
