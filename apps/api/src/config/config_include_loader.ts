import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { parse } from "yaml";
import { ConfigDocumentMerger } from "./config_document_merger.ts";
import { ConfigPathResolver } from "./config_path_resolver.ts";
import { DotEnvLoader } from "./dot_env_loader.ts";

/**
 * Resolves root-level config includes recursively so environment-specific files can inherit a base
 * config and override only the settings that differ.
 */
export class ConfigIncludeLoader {
  static load(configPath: string): unknown {
    return ConfigIncludeLoader.loadWithVisitedPaths(configPath, []);
  }

  private static loadWithVisitedPaths(
    configPath: string,
    visitedConfigPaths: string[],
  ): unknown {
    if (visitedConfigPaths.includes(configPath)) {
      throw new Error(
        `Config include cycle detected: ${[...visitedConfigPaths, configPath].join(" -> ")}.`,
      );
    }

    const rawConfig = readFileSync(configPath, "utf8");
    const parsedConfig = parse(rawConfig) as unknown;
    const includedConfigPath = ConfigIncludeLoader.resolveIncludedConfigPath(parsedConfig, configPath);
    if (!includedConfigPath) {
      DotEnvLoader.loadForConfigPath(configPath);
      return parsedConfig;
    }

    const baseConfig = ConfigIncludeLoader.loadWithVisitedPaths(includedConfigPath, [
      ...visitedConfigPaths,
      configPath,
    ]);
    DotEnvLoader.loadForConfigPath(configPath);
    const overrideConfig = ConfigIncludeLoader.removeIncludeField(parsedConfig);
    return ConfigDocumentMerger.merge(baseConfig, overrideConfig);
  }

  private static resolveIncludedConfigPath(parsedConfig: unknown, configPath: string): string | undefined {
    if (!ConfigIncludeLoader.isPlainObject(parsedConfig) || !("include" in parsedConfig)) {
      return undefined;
    }

    const includePath = parsedConfig.include;
    if (typeof includePath !== "string" || !includePath.trim()) {
      throw new Error(`Config include at "${configPath}" must be a non-empty string.`);
    }

    return ConfigPathResolver.resolve(includePath, dirname(configPath));
  }

  private static removeIncludeField(parsedConfig: unknown): unknown {
    if (!ConfigIncludeLoader.isPlainObject(parsedConfig) || !("include" in parsedConfig)) {
      return parsedConfig;
    }

    const remainingEntries = Object.entries(parsedConfig).filter(([key]) => key !== "include");
    return Object.fromEntries(remainingEntries);
  }

  private static isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
}
