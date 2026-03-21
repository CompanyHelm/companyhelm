import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { ConfigDefinition } from "./config.ts";

const DEFAULT_LOCAL_CONFIG_FILE_NAME = "local.yaml";

export class ConfigPathResolver {
  static resolve<TConfig>(
    definition: ConfigDefinition<TConfig>,
    configPath: string | undefined,
    cwd: string,
  ): string {
    const explicitPath = ConfigPathResolver.readExplicitPath(
      definition.configPathEnvironmentVariableName,
      configPath,
    );
    const resolvedConfigPath = explicitPath
      ? ConfigPathResolver.resolveExplicitPath(explicitPath, cwd)
      : ConfigPathResolver.resolveLocalPath(cwd, definition.localConfigFileName);

    if (!existsSync(resolvedConfigPath)) {
      throw new Error(`No config file found at path "${resolvedConfigPath}".`);
    }

    return resolvedConfigPath;
  }

  private static readExplicitPath(
    configPathEnvironmentVariableName: string | undefined,
    configPath: string | undefined,
  ): string | undefined {
    const normalizedConfigPath = configPath?.trim();
    if (normalizedConfigPath) {
      return normalizedConfigPath;
    }

    return configPathEnvironmentVariableName
      ? process.env[configPathEnvironmentVariableName]?.trim()
      : undefined;
  }

  private static resolveLocalPath(cwd: string, localConfigFileName?: string): string {
    return resolve(cwd, "config", localConfigFileName ?? DEFAULT_LOCAL_CONFIG_FILE_NAME);
  }

  private static resolveExplicitPath(configPath: string, cwd: string): string {
    if (!configPath.trim()) {
      throw new Error("Config path cannot be empty.");
    }

    return isAbsolute(configPath) ? configPath : resolve(cwd, configPath);
  }
}
