import { readFileSync } from "node:fs";
import { type ZodType } from "zod";
import { parse } from "yaml";
import { ConfigPathResolver } from "./config_path_resolver.ts";
import { DotEnvLoader } from "./dot_env_loader.ts";
import { EnvironmentPlaceholderResolver } from "./environment_placeholder_resolver.ts";

/**
 * Loads and validates a typed configuration document from disk.
 */
export class ConfigLoader {
  private constructor() {
  }

  static load<TConfig>(
    configPath: string,
    schema: ZodType<TConfig>,
  ): TConfig {
    const resolvedConfigPath = ConfigPathResolver.resolve(configPath, process.cwd());
    DotEnvLoader.loadForConfigPath(resolvedConfigPath);
    const rawConfig = readFileSync(resolvedConfigPath, "utf8");
    const parsedConfig = parse(rawConfig) as unknown;
    const resolvedConfig = EnvironmentPlaceholderResolver.resolve(parsedConfig);
    return schema.parse(resolvedConfig);
  }
}
