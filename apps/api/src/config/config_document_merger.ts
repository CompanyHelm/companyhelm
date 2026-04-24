/**
 * Merges configuration documents so an override file can replace only the branches it cares about
 * while inheriting the rest of the base config unchanged.
 */
export class ConfigDocumentMerger {
  static merge(baseValue: unknown, overrideValue: unknown): unknown {
    if (!ConfigDocumentMerger.isPlainObject(baseValue) || !ConfigDocumentMerger.isPlainObject(overrideValue)) {
      return overrideValue;
    }

    const mergedEntries = new Map<string, unknown>();
    for (const [key, value] of Object.entries(baseValue)) {
      mergedEntries.set(key, value);
    }

    for (const [key, value] of Object.entries(overrideValue)) {
      const existingValue = mergedEntries.get(key);
      mergedEntries.set(key, ConfigDocumentMerger.merge(existingValue, value));
    }

    return Object.fromEntries(mergedEntries);
  }

  private static isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
}
