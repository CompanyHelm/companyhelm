/**
 * Converts service records into JSON-safe objects for the generic system_command tool. System
 * commands return structured data, so dates and nested arrays need stable serialization before the
 * response is exposed to the agent.
 */
export class SystemCommandJsonSerializer {
  serializeRecord(value: unknown): Record<string, unknown> {
    const serialized = this.serialize(value);
    if (typeof serialized !== "object" || serialized === null || Array.isArray(serialized)) {
      throw new Error("System command handler did not return a JSON object.");
    }

    return serialized as Record<string, unknown>;
  }

  serialize(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map((entry) => this.serialize(entry));
    }
    if (typeof value === "object" && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, this.serialize(entry)]),
      );
    }

    return value;
  }
}
