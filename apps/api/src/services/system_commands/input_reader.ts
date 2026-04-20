/**
 * Reads loosely typed JSON payloads for system commands while keeping validation errors close to
 * the command boundary. The generic system_command tool accepts any JSON, so each dispatcher uses
 * this helper to turn payload fields into the narrower service inputs it needs.
 */
export class SystemCommandInputReader {
  requireRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("System command input must be a JSON object.");
    }

    return value as Record<string, unknown>;
  }

  requireString(payload: Record<string, unknown>, key: string): string {
    const value = this.optionalString(payload, key);
    if (!value) {
      throw new Error(`${key} is required.`);
    }

    return value;
  }

  optionalString(payload: Record<string, unknown>, key: string): string | undefined {
    const value = payload[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== "string") {
      throw new Error(`${key} must be a string.`);
    }

    return value;
  }

  optionalNullableString(payload: Record<string, unknown>, key: string): string | null | undefined {
    const value = payload[key];
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value !== "string") {
      throw new Error(`${key} must be a string or null.`);
    }

    return value;
  }

  optionalBoolean(payload: Record<string, unknown>, key: string): boolean | undefined {
    const value = payload[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== "boolean") {
      throw new Error(`${key} must be a boolean.`);
    }

    return value;
  }

  optionalInteger(payload: Record<string, unknown>, key: string): number | undefined {
    const value = payload[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new Error(`${key} must be an integer.`);
    }

    return value;
  }

  optionalStringArray(payload: Record<string, unknown>, key: string): string[] | null | undefined {
    const value = payload[key];
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
      throw new Error(`${key} must be an array of strings or null.`);
    }

    return value;
  }

  optionalRecord(payload: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
    const value = payload[key];
    if (value === undefined || value === null) {
      return undefined;
    }

    return this.requireRecord(value);
  }
}
