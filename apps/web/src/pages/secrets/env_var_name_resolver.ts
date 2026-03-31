/**
 * Mirrors the backend secret env-var derivation rules so the dialog can preview the eventual
 * environment variable name before submission without drifting from API behavior.
 */
export class EnvVarNameResolver {
  resolveDefaultEnvVarName(name: string): string | null {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return null;
    }

    const resolvedEnvVarName = trimmedName
      .toUpperCase()
      .replaceAll(/[\s-]+/g, "_")
      .replaceAll(/[^A-Z0-9_]/g, "_")
      .replaceAll(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    return /^[A-Z_][A-Z0-9_]*$/.test(resolvedEnvVarName) ? resolvedEnvVarName : null;
  }
}
