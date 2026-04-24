import { type ZodType } from "zod";
import { ConfigPathResolver } from "./config_path_resolver.ts";
import { ConfigIncludeLoader } from "./config_include_loader.ts";
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
    const parsedConfig = ConfigIncludeLoader.load(resolvedConfigPath);
    const resolvedConfig = EnvironmentPlaceholderResolver.resolve(parsedConfig);
    return schema.parse(resolvedConfig);
  }
}
