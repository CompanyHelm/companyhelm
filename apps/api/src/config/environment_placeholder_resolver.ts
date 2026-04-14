const requiredEnvPlaceholderPattern = /\$\{([A-Z0-9_]+)\}/g;
const optionalEnvPlaceholderPattern = /\$\{\?([A-Z0-9_]+)\}/g;
const standaloneOptionalEnvPlaceholderPattern = /^\$\{\?([A-Z0-9_]+)\}$/;

export class EnvironmentPlaceholderResolver {
  static resolve(value: unknown, path = ""): unknown {
    if (typeof value === "string") {
      const standaloneOptionalMatch = value.match(standaloneOptionalEnvPlaceholderPattern);
      if (standaloneOptionalMatch) {
        const variableName = standaloneOptionalMatch[1];
        const resolvedValue = variableName ? process.env[variableName] : undefined;
        return resolvedValue || undefined;
      }

      const hasRequiredPlaceholders = requiredEnvPlaceholderPattern.test(value);
      const hasOptionalPlaceholders = optionalEnvPlaceholderPattern.test(value);
      requiredEnvPlaceholderPattern.lastIndex = 0;
      optionalEnvPlaceholderPattern.lastIndex = 0;
      if (!hasRequiredPlaceholders && !hasOptionalPlaceholders) {
        return value;
      }

      const withOptionalPlaceholdersResolved = value.replace(
        optionalEnvPlaceholderPattern,
        (_fullMatch, variableName: string) => process.env[variableName] || "",
      );

      return withOptionalPlaceholdersResolved.replace(requiredEnvPlaceholderPattern, (_fullMatch, variableName: string) => {
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
