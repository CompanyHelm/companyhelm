import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { ZodError, type ZodType } from "zod";
import { parse } from "yaml";

const DEFAULT_LOCAL_CONFIG_FILE_NAME = "local.yaml";
const envPlaceholderPattern = /\$\{([A-Z0-9_]+)\}/g;

export type ConfigDefinition<TDocument> = {
  schema: ZodType<TDocument>;
  configPathEnvironmentVariableName?: string;
  localConfigFileName?: string;
};

/**
 * Loads, validates, and caches typed configuration documents for any schema-backed application.
 */
export class Config<TDocument> {
  private static cachedConfigs = new WeakMap<ZodType<unknown>, Map<string, Config<unknown>>>();
  private readonly configPath: string;
  private readonly document: TDocument;

  private constructor(configPath: string, document: TDocument) {
    this.configPath = configPath;
    this.document = document;
  }

  static resolveConfigPath<TDocument>(
    definition: ConfigDefinition<TDocument>,
    configPath?: string,
    cwd: string = process.cwd(),
  ): string {
    return ConfigPathResolver.resolve(definition, configPath, cwd);
  }

  static loadFromPath<TDocument>(
    definition: ConfigDefinition<TDocument>,
    configPath: string,
  ): Config<TDocument> {
    const resolvedConfigPath = Config.resolveConfigPath(definition, configPath);
    DotEnvLoader.loadForConfigPath(resolvedConfigPath, definition.localConfigFileName);
    const rawConfig = readFileSync(resolvedConfigPath, "utf8");
    const parsedConfig = parse(rawConfig) as unknown;
    const resolvedConfig = EnvironmentPlaceholderResolver.resolve(parsedConfig);
    const document = Config.parseDocument(resolvedConfig, definition.schema);
    return new Config(resolvedConfigPath, document);
  }

  static load<TDocument>(
    definition: ConfigDefinition<TDocument>,
    configPath?: string,
  ): Config<TDocument> {
    return Config.loadFromPath(
      definition,
      Config.resolveConfigPath(definition, configPath),
    );
  }

  static get<TDocument>(
    definition: ConfigDefinition<TDocument>,
    configPath?: string,
  ): Config<TDocument> {
    const resolvedConfigPath = Config.resolveConfigPath(definition, configPath);
    let cachedConfigsForSchema = Config.cachedConfigs.get(definition.schema as ZodType<unknown>);

    if (!cachedConfigsForSchema) {
      cachedConfigsForSchema = new Map<string, Config<unknown>>();
      Config.cachedConfigs.set(definition.schema as ZodType<unknown>, cachedConfigsForSchema);
    }

    const cachedConfig = cachedConfigsForSchema.get(resolvedConfigPath);
    if (cachedConfig) {
      return cachedConfig as Config<TDocument>;
    }

    const loadedConfig = Config.loadFromPath(definition, resolvedConfigPath);
    cachedConfigsForSchema.set(resolvedConfigPath, loadedConfig as Config<unknown>);
    return loadedConfig;
  }

  static clearCache<TDocument>(definition?: ConfigDefinition<TDocument>) {
    if (!definition) {
      Config.cachedConfigs = new WeakMap<ZodType<unknown>, Map<string, Config<unknown>>>();
      return;
    }

    Config.cachedConfigs.delete(definition.schema as ZodType<unknown>);
  }

  getPath(): string {
    return this.configPath;
  }

  getDocument(): TDocument {
    return this.document;
  }

  private static parseDocument<TDocument>(
    value: unknown,
    schema: ZodType<TDocument>,
  ): TDocument {
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

class ConfigPathResolver {
  static resolve<TDocument>(
    definition: ConfigDefinition<TDocument>,
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

class DotEnvLoader {
  static loadForConfigPath(configPath: string, localConfigFileName?: string) {
    const dotEnvPath = DotEnvLoader.resolveDotEnvPathForConfigPath(configPath, localConfigFileName);
    if (!dotEnvPath || !existsSync(dotEnvPath)) {
      return;
    }

    process.loadEnvFile(dotEnvPath);
  }

  private static resolveDotEnvPathForConfigPath(
    configPath: string,
    localConfigFileName?: string,
  ): string | undefined {
    const expectedLocalConfigFileName = localConfigFileName ?? DEFAULT_LOCAL_CONFIG_FILE_NAME;
    if (basename(configPath) !== expectedLocalConfigFileName) {
      return undefined;
    }

    return resolve(dirname(configPath), "..", ".env.local");
  }
}

class EnvironmentPlaceholderResolver {
  static resolve(value: unknown, path = ""): unknown {
    if (typeof value === "string") {
      const placeholderPath = path || "<root>";
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
              placeholderPath,
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

  private static createMissingVariableMessage(variableName: string, _placeholderPath: string): string {
    return `Missing environment variable "${variableName}".`;
  }
}
