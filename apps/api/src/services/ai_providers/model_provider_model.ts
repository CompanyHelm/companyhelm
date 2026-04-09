/**
 * Represents a single provider model that can be surfaced to product features while carrying
 * optional reasoning metadata used by the UI and downstream persistence.
 */
export class ModelProviderModel {
  readonly provider: string;
  readonly modelId: string;
  readonly name: string;
  readonly description: string;
  readonly reasoningSupported: boolean;
  readonly reasoningLevels: string[] | null;

  constructor(input: {
    provider: string;
    modelId: string;
    name: string;
    description: string;
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
    this.reasoningLevels = Array.isArray(input.reasoningLevels) && input.reasoningLevels.length > 0
      ? input.reasoningLevels.map((level) => String(level || "").trim()).filter((level) => level.length > 0)
      : null;
    this.reasoningSupported = typeof input.reasoningSupported === "boolean"
      ? input.reasoningSupported
      : this.reasoningLevels !== null;
  }
}
