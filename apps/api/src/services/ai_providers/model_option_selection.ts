import type {
  ModelProviderOptionDefinition,
  ModelProviderOptionValue,
  ModelProviderOptionValues,
} from "./model_provider_model.ts";

const MODEL_PROVIDER_OPTION_TYPES = new Set(["select", "number", "text", "boolean"]);

/**
 * Validates and normalizes user-selected generic model options against the resolved model catalog
 * definitions so provider-specific knobs can be stored safely without making every option a
 * first-class database column.
 */
export class ModelOptionSelection {
  static normalizeDefinitions(rawDefinitions: unknown): ModelProviderOptionDefinition[] {
    if (!Array.isArray(rawDefinitions)) {
      return [];
    }

    return rawDefinitions.filter((definition): definition is ModelProviderOptionDefinition => {
      return typeof definition === "object"
        && definition !== null
        && typeof (definition as { key?: unknown }).key === "string"
        && typeof (definition as { name?: unknown }).name === "string"
        && typeof (definition as { description?: unknown }).description === "string"
        && typeof (definition as { type?: unknown }).type === "string"
        && MODEL_PROVIDER_OPTION_TYPES.has((definition as { type: string }).type);
    });
  }

  static normalizeSelectedValues(
    definitions: readonly ModelProviderOptionDefinition[],
    rawValues: unknown,
  ): ModelProviderOptionValues {
    if (!rawValues || typeof rawValues !== "object" || Array.isArray(rawValues)) {
      return {};
    }

    const inputValues = rawValues as Record<string, unknown>;
    const normalizedValues: ModelProviderOptionValues = {};
    for (const definition of definitions) {
      if (!Object.prototype.hasOwnProperty.call(inputValues, definition.key)) {
        continue;
      }

      normalizedValues[definition.key] = this.normalizeValue(definition, inputValues[definition.key]);
    }

    return normalizedValues;
  }

  static mergeWithDefaults(
    definitions: readonly ModelProviderOptionDefinition[],
    rawValues: unknown,
  ): ModelProviderOptionValues {
    const normalizedValues = this.normalizeSelectedValues(definitions, rawValues);
    const mergedValues: ModelProviderOptionValues = {};
    for (const definition of definitions) {
      if (Object.prototype.hasOwnProperty.call(normalizedValues, definition.key)) {
        mergedValues[definition.key] = normalizedValues[definition.key];
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(definition, "defaultValue")) {
        mergedValues[definition.key] = definition.defaultValue ?? null;
      }
    }

    return mergedValues;
  }

  private static normalizeValue(
    definition: ModelProviderOptionDefinition,
    rawValue: unknown,
  ): ModelProviderOptionValue {
    if (definition.type === "select") {
      const allowedOptions = definition.options ?? [];
      const matchedOption = allowedOptions.find((option) => option.value === rawValue);
      if (!matchedOption) {
        throw new Error(`${definition.name} is not supported for the selected model.`);
      }

      return matchedOption.value;
    }

    if (definition.type === "boolean") {
      if (typeof rawValue !== "boolean") {
        throw new Error(`${definition.name} must be true or false.`);
      }

      return rawValue;
    }

    if (definition.type === "number") {
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        throw new Error(`${definition.name} must be a number.`);
      }

      return rawValue;
    }

    if (typeof rawValue !== "string") {
      throw new Error(`${definition.name} must be text.`);
    }

    return rawValue;
  }
}
