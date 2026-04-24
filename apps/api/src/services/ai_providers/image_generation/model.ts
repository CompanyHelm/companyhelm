/**
 * Represents one provider-backed image generation model together with the capability metadata that
 * CompanyHelm needs for validation, persistence, and UI rendering.
 */
export class ImageGenerationProviderModel {
  readonly description: string;
  readonly modelId: string;
  readonly name: string;
  readonly outputMimeTypes: string[];
  readonly provider: string;
  readonly supportedQualities: string[];
  readonly supportedSizes: string[];
  readonly supportsEditing: boolean;
  readonly supportsFlexibleSizes: boolean;
  readonly supportsTransparentBackground: boolean;

  constructor(input: {
    description: string;
    modelId: string;
    name: string;
    outputMimeTypes?: string[];
    provider: string;
    supportedQualities?: string[];
    supportedSizes?: string[];
    supportsEditing?: boolean;
    supportsFlexibleSizes?: boolean;
    supportsTransparentBackground?: boolean;
  }) {
    const normalizedDescription = String(input.description || "").trim();
    const normalizedModelId = String(input.modelId || "").trim();
    const normalizedName = String(input.name || "").trim();
    const normalizedProvider = String(input.provider || "").trim();
    if (!normalizedProvider) {
      throw new Error("Image generation provider is required.");
    }
    if (!normalizedModelId) {
      throw new Error("Image generation model id is required.");
    }
    if (!normalizedName) {
      throw new Error("Image generation model name is required.");
    }
    if (!normalizedDescription) {
      throw new Error("Image generation model description is required.");
    }

    this.description = normalizedDescription;
    this.modelId = normalizedModelId;
    this.name = normalizedName;
    this.outputMimeTypes = ImageGenerationProviderModel.normalizeList(input.outputMimeTypes, ["image/png"]);
    this.provider = normalizedProvider;
    this.supportedQualities = ImageGenerationProviderModel.normalizeList(input.supportedQualities, ["auto"]);
    this.supportedSizes = ImageGenerationProviderModel.normalizeList(input.supportedSizes, ["auto"]);
    this.supportsEditing = Boolean(input.supportsEditing);
    this.supportsFlexibleSizes = Boolean(input.supportsFlexibleSizes);
    this.supportsTransparentBackground = Boolean(input.supportsTransparentBackground);
  }

  private static normalizeList(values: string[] | undefined, fallback: string[]): string[] {
    const normalizedValues = Array.isArray(values)
      ? values.map((value) => String(value || "").trim()).filter((value) => value.length > 0)
      : [];
    return normalizedValues.length > 0 ? normalizedValues : [...fallback];
  }
}
