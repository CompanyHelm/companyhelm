import { readFileSync } from "node:fs";
import { ZodError, type ZodType } from "zod";
import { parse } from "yaml";
import { ConfigPathResolver } from "./config_path_resolver.ts";
import { DotEnvLoader } from "./dot_env_loader.ts";
import { EnvironmentPlaceholderResolver } from "./environment_placeholder_resolver.ts";

export type ConfigDefinition<TConfig> = {
  schema: ZodType<TConfig>;
  configPathEnvironmentVariableName?: string;
  localConfigFileName?: string;
};

/**
 * Loads, validates, and caches typed configuration documents for any schema-backed application.
 */
export class Config<TConfig> {
  private static cachedConfigs = new WeakMap<ZodType<unknown>, Map<string, Config<unknown>>>();
  private readonly configPath: string;
  private readonly document: TConfig;

  private constructor(configPath: string, document: TConfig) {
    this.configPath = configPath;
    this.document = document;
  }

  static resolveConfigPath<TConfig>(
    definition: ConfigDefinition<TConfig>,
    configPath?: string,
    cwd: string = process.cwd(),
  ): string {
    return ConfigPathResolver.resolve(definition, configPath, cwd);
  }

  static load<TConfig>(
    configPath: string,
    schema: ZodType<TConfig>,
  ): Config<TConfig> {
    const resolvedConfigPath = Config.resolveConfigPath({
      schema,
    }, configPath);
    DotEnvLoader.loadForConfigPath(resolvedConfigPath);
    const rawConfig = readFileSync(resolvedConfigPath, "utf8");
    const parsedConfig = parse(rawConfig) as unknown;
    const resolvedConfig = EnvironmentPlaceholderResolver.resolve(parsedConfig);
    const document = Config.parseDocument(resolvedConfig, schema);
    return new Config(resolvedConfigPath, document);
  }

  static get<TConfig>(
    definition: ConfigDefinition<TConfig>,
    configPath?: string,
  ): Config<TConfig> {
    const resolvedConfigPath = Config.resolveConfigPath(definition, configPath);
    let cachedConfigsForSchema = Config.cachedConfigs.get(definition.schema as ZodType<unknown>);

    if (!cachedConfigsForSchema) {
      cachedConfigsForSchema = new Map<string, Config<unknown>>();
      Config.cachedConfigs.set(definition.schema as ZodType<unknown>, cachedConfigsForSchema);
    }

    const cachedConfig = cachedConfigsForSchema.get(resolvedConfigPath);
    if (cachedConfig) {
      return cachedConfig as Config<TConfig>;
    }

    const loadedConfig = Config.load(resolvedConfigPath, definition.schema);
    cachedConfigsForSchema.set(resolvedConfigPath, loadedConfig as Config<unknown>);
    return loadedConfig;
  }

  static clearCache<TConfig>(definition?: ConfigDefinition<TConfig>) {
    if (!definition) {
      Config.cachedConfigs = new WeakMap<ZodType<unknown>, Map<string, Config<unknown>>>();
      return;
    }

    Config.cachedConfigs.delete(definition.schema as ZodType<unknown>);
  }

  getPath(): string {
    return this.configPath;
  }

  getDocument(): TConfig {
    return this.document;
  }

  private static parseDocument<TConfig>(
    value: unknown,
    schema: ZodType<TConfig>,
  ): TConfig {
    try {
      return schema.parse(value);
    } catch (error) {
      if (!(error instanceof ZodError)) {
        throw error;
      }

      throw new Error(Config.createValidationErrorMessage(error));
    }
  }

  private static createValidationErrorMessage(error: ZodError): string {
    const [firstIssue] = error.issues;
    if (!firstIssue) {
      return "Invalid config.";
    }

    const issuePath = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "<root>";
    return `Invalid config value at "${issuePath}": ${firstIssue.message}`;
  }
}
