const envPlaceholderPattern = /\$\{([A-Z0-9_]+)\}/g;

export class EnvironmentPlaceholderResolver {
  static resolve(value: unknown, path = ""): unknown {
    if (typeof value === "string") {
      const placeholders = [...value.matchAll(envPlaceholderPattern)];
      if (placeholders.length === 0) {
        return value;
      }

      return value.replace(envPlaceholderPattern, (_fullMatch, variableName: string) => {
        const resolvedValue = process.env[variableName];
        if (!resolvedValue) {
          throw new Error(
            EnvironmentPlaceholderResolver.createMissingVariableMessage(
              variableName,
            ),
          );
        }

        return resolvedValue;
      });
    }

    if (Array.isArray(value)) {
      return value.map((entry, index) =>
        EnvironmentPlaceholderResolver.resolve(entry, `${path}[${index}]`),
      );
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
          key,
          EnvironmentPlaceholderResolver.resolve(
            entry,
            path ? `${path}.${key}` : key,
          ),
        ]),
      );
    }

    return value;
  }

  private static createMissingVariableMessage(variableName: string): string {
    return `Missing environment variable "${variableName}".`;
  }
}
