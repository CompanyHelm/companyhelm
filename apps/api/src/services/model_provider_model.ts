/**
 * Represents a single provider model that can be surfaced to product features while carrying
 * optional reasoning metadata used by the UI and downstream persistence.
 */
export class ModelProviderModel {
  readonly provider: string;
  readonly name: string;
  readonly reasoningLevels: string[] | null;

  constructor(input: {
    provider: string;
    name: string;
    reasoningLevels?: string[] | null;
  }) {
    const normalizedProvider = String(input.provider || "").trim();
    const normalizedName = String(input.name || "").trim();
    if (!normalizedProvider) {
      throw new Error("Model provider is required.");
    }
    if (!normalizedName) {
      throw new Error("Model name is required.");
    }

    this.provider = normalizedProvider;
    this.name = normalizedName;
    this.reasoningLevels = Array.isArray(input.reasoningLevels) && input.reasoningLevels.length > 0
      ? input.reasoningLevels.map((level) => String(level || "").trim()).filter((level) => level.length > 0)
      : null;
  }
}
