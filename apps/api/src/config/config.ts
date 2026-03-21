import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import type { FastifyListenOptions, FastifyServerOptions } from "fastify";
import { parse } from "yaml";

const envPlaceholderPattern = /\$\{([A-Z0-9_]+)\}/g;
const CONFIG_PATH_ENV = "COMPANYHELM_CONFIG_PATH";
const LOCAL_CONFIG_FILENAME = "local.yaml";

export type AuthProvider = "companyhelm" | "supabase";
export type LogLevel = "debug" | "info" | "warn" | "error";

export type AppConfigDocument = {
  host: string;
  port: number;
  graphql: {
    endpoint: string;
    graphiql: boolean;
  };
  publicUrl: string;
  database: {
    name: string;
    host: string;
    port: number;
    roles: {
      app_runtime: {
        username: string;
        password: string;
      };
      admin: {
        username: string;
        password: string;
      };
    };
  };
  github: {
    app_client_id: string;
    app_private_key_pem: string;
    app_link: string;
  };
  auth: {
    provider: AuthProvider;
    companyhelm?: {
      jwt_private_key_pem: string;
      jwt_public_key_pem: string;
      jwt_issuer: string;
      jwt_audience: string;
      jwt_expiration_seconds: number;
    };
    supabase?: {
      url: string;
      anon_key: string;
    };
  };
  security: {
    encryption: {
      key: string;
    };
  };
  log_level: LogLevel;
  log_pretty: boolean;
};

/**
 * Centralizes application configuration loading so Fastify startup reads from one source of truth.
 * The instance exposes dedicated methods for runtime consumers and keeps the parsed document typed
 * for the rest of the application.
 */
export class AppConfig {
  private static cachedConfig: AppConfig | undefined;
  private static cachedConfigPath: string | undefined;
  private readonly configPath: string;
  private readonly document: AppConfigDocument;

  private constructor(configPath: string, document: AppConfigDocument) {
    this.configPath = configPath;
    this.document = document;
  }

  static resolveConfigPath(configPath?: string, cwd: string = process.cwd()): string {
    const explicitPath = configPath?.trim() || process.env[CONFIG_PATH_ENV]?.trim();
    const resolvedConfigPath = explicitPath
      ? ConfigPathResolver.resolveExplicitPath(explicitPath, cwd)
      : ConfigPathResolver.resolveLocalPath(cwd);

    if (!existsSync(resolvedConfigPath)) {
      throw new Error(`No config file found at path "${resolvedConfigPath}".`);
    }

    return resolvedConfigPath;
  }

  static loadFromPath(configPath: string): AppConfig {
    const resolvedConfigPath = AppConfig.resolveConfigPath(configPath);
    DotEnvLoader.loadForConfigPath(resolvedConfigPath);
    const rawConfig = readFileSync(resolvedConfigPath, "utf8");
    const parsedConfig = parse(rawConfig) as unknown;
    const resolvedConfig = EnvironmentPlaceholderResolver.resolve(parsedConfig);
    const document = new AppConfigDocumentParser(resolvedConfig).parse();
    return new AppConfig(resolvedConfigPath, document);
  }

  static load(configPath?: string): AppConfig {
    return AppConfig.loadFromPath(AppConfig.resolveConfigPath(configPath));
  }

  static get(configPath?: string): AppConfig {
    const resolvedConfigPath = AppConfig.resolveConfigPath(configPath);
    if (
      !AppConfig.cachedConfig ||
      AppConfig.cachedConfigPath !== resolvedConfigPath
    ) {
      AppConfig.cachedConfig = AppConfig.loadFromPath(resolvedConfigPath);
      AppConfig.cachedConfigPath = resolvedConfigPath;
    }

    return AppConfig.cachedConfig;
  }

  static clearCache() {
    AppConfig.cachedConfig = undefined;
    AppConfig.cachedConfigPath = undefined;
  }

  getPath(): string {
    return this.configPath;
  }

  getDocument(): AppConfigDocument {
    return this.document;
  }

  getFastifyOptions(): FastifyServerOptions {
    return {
      logger: {
        level: this.document.log_level,
      },
    };
  }

  getListenOptions(): FastifyListenOptions {
    return {
      host: this.document.host,
      port: this.document.port,
    };
  }
}

class ConfigPathResolver {
  static normalizeProvidedPath(configPath: string): string {
    const normalizedPath = configPath.trim();
    if (!normalizedPath) {
      throw new Error("Config path cannot be empty.");
    }

    return normalizedPath;
  }

  static resolveLocalPath(cwd: string): string {
    return resolve(cwd, "config", LOCAL_CONFIG_FILENAME);
  }

  static resolveExplicitPath(configPath: string, cwd: string): string {
    const normalizedPath = ConfigPathResolver.normalizeProvidedPath(configPath);
    return isAbsolute(normalizedPath) ? normalizedPath : resolve(cwd, normalizedPath);
  }
}

class DotEnvLoader {
  static loadForConfigPath(configPath: string) {
    if (basename(configPath) !== LOCAL_CONFIG_FILENAME) {
      return;
    }

    const dotEnvPath = resolve(dirname(configPath), "..", ".env.local");
    if (!existsSync(dotEnvPath)) {
      return;
    }

    process.loadEnvFile(dotEnvPath);
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
            `Environment variable "${variableName}" is required for config value at "${placeholderPath}".`,
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
          EnvironmentPlaceholderResolver.resolve(entry, path ? `${path}.${key}` : key),
        ]),
      );
    }

    return value;
  }
}

class AppConfigDocumentParser {
  private readonly value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }

  parse(): AppConfigDocument {
    const config = this.expectRecord(this.value, "<root>");
    const auth = this.readAuth(config);

    return {
      host: this.readString(config, "host"),
      port: this.readPositiveInteger(config, "port"),
      graphql: this.readGraphql(config),
      publicUrl: this.readString(config, "publicUrl"),
      database: this.readDatabase(config),
      github: this.readGithub(config),
      auth,
      security: this.readSecurity(config),
      log_level: this.readLogLevel(config),
      log_pretty: this.readBoolean(config, "log_pretty"),
    };
  }

  private readGraphql(config: Record<string, unknown>): AppConfigDocument["graphql"] {
    const graphql = this.expectRecord(config.graphql, "graphql");
    return {
      endpoint: this.readString(graphql, "endpoint", "graphql"),
      graphiql: this.readBoolean(graphql, "graphiql", "graphql"),
    };
  }

  private readDatabase(config: Record<string, unknown>): AppConfigDocument["database"] {
    const database = this.expectRecord(config.database, "database");
    const roles = this.expectRecord(database.roles, "database.roles");

    return {
      name: this.readString(database, "name", "database"),
      host: this.readString(database, "host", "database"),
      port: this.readPositiveInteger(database, "port", "database"),
      roles: {
        app_runtime: this.readDatabaseRole(roles, "app_runtime"),
        admin: this.readDatabaseRole(roles, "admin"),
      },
    };
  }

  private readDatabaseRole(
    roles: Record<string, unknown>,
    roleName: "app_runtime" | "admin",
  ): AppConfigDocument["database"]["roles"]["app_runtime"] {
    const role = this.expectRecord(roles[roleName], `database.roles.${roleName}`);
    return {
      username: this.readString(role, "username", `database.roles.${roleName}`),
      password: this.readString(role, "password", `database.roles.${roleName}`),
    };
  }

  private readGithub(config: Record<string, unknown>): AppConfigDocument["github"] {
    const github = this.expectRecord(config.github, "github");
    return {
      app_client_id: this.readString(github, "app_client_id", "github"),
      app_private_key_pem: this.readString(github, "app_private_key_pem", "github"),
      app_link: this.readString(github, "app_link", "github"),
    };
  }

  private readAuth(config: Record<string, unknown>): AppConfigDocument["auth"] {
    const auth = this.expectRecord(config.auth, "auth");
    const provider = this.readProvider(auth);
    const document: AppConfigDocument["auth"] = { provider };

    if (provider === "companyhelm") {
      document.companyhelm = this.readCompanyHelmAuth(auth);
      return document;
    }

    document.supabase = this.readSupabaseAuth(auth);
    return document;
  }

  private readProvider(auth: Record<string, unknown>): AuthProvider {
    const provider = this.readString(auth, "provider", "auth");
    if (provider !== "companyhelm" && provider !== "supabase") {
      throw new Error(
        `Config value at "auth.provider" must be one of "companyhelm" or "supabase".`,
      );
    }

    return provider;
  }

  private readCompanyHelmAuth(
    auth: Record<string, unknown>,
  ): NonNullable<AppConfigDocument["auth"]["companyhelm"]> {
    const companyhelm = this.expectRecord(auth.companyhelm, "auth.companyhelm");
    return {
      jwt_private_key_pem: this.readString(
        companyhelm,
        "jwt_private_key_pem",
        "auth.companyhelm",
      ),
      jwt_public_key_pem: this.readString(
        companyhelm,
        "jwt_public_key_pem",
        "auth.companyhelm",
      ),
      jwt_issuer: this.readString(companyhelm, "jwt_issuer", "auth.companyhelm"),
      jwt_audience: this.readString(companyhelm, "jwt_audience", "auth.companyhelm"),
      jwt_expiration_seconds: this.readPositiveInteger(
        companyhelm,
        "jwt_expiration_seconds",
        "auth.companyhelm",
      ),
    };
  }

  private readSupabaseAuth(
    auth: Record<string, unknown>,
  ): NonNullable<AppConfigDocument["auth"]["supabase"]> {
    const supabase = this.expectRecord(auth.supabase, "auth.supabase");
    return {
      url: this.readString(supabase, "url", "auth.supabase"),
      anon_key: this.readString(supabase, "anon_key", "auth.supabase"),
    };
  }

  private readSecurity(config: Record<string, unknown>): AppConfigDocument["security"] {
    const security = this.expectRecord(config.security, "security");
    const encryption = this.expectRecord(security.encryption, "security.encryption");
    return {
      encryption: {
        key: this.readString(encryption, "key", "security.encryption"),
      },
    };
  }

  private readLogLevel(config: Record<string, unknown>): LogLevel {
    const logLevel = this.readString(config, "log_level");
    if (
      logLevel !== "debug" &&
      logLevel !== "info" &&
      logLevel !== "warn" &&
      logLevel !== "error"
    ) {
      throw new Error(
        `Config value at "log_level" must be one of "debug", "info", "warn", or "error".`,
      );
    }

    return logLevel;
  }

  private readString(
    record: Record<string, unknown>,
    key: string,
    parentPath = "<root>",
  ): string {
    const value = record[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Config value at "${this.createPath(parentPath, key)}" must be a string.`);
    }

    return value;
  }

  private readBoolean(
    record: Record<string, unknown>,
    key: string,
    parentPath = "<root>",
  ): boolean {
    const value = record[key];
    if (typeof value !== "boolean") {
      throw new Error(`Config value at "${this.createPath(parentPath, key)}" must be a boolean.`);
    }

    return value;
  }

  private readPositiveInteger(
    record: Record<string, unknown>,
    key: string,
    parentPath = "<root>",
  ): number {
    const value = record[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
      throw new Error(
        `Config value at "${this.createPath(parentPath, key)}" must be a positive integer.`,
      );
    }

    return value;
  }

  private expectRecord(value: unknown, path: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Config value at "${path}" must be an object.`);
    }

    return value as Record<string, unknown>;
  }

  private createPath(parentPath: string, key: string): string {
    return parentPath === "<root>" ? key : `${parentPath}.${key}`;
  }
}

export function resolveConfigPath(configPath?: string, cwd: string = process.cwd()): string {
  return AppConfig.resolveConfigPath(configPath, cwd);
}

export function loadConfigFromPath(configPath: string): AppConfig {
  return AppConfig.loadFromPath(configPath);
}

export function loadConfig(configPath?: string): AppConfig {
  return AppConfig.load(configPath);
}

export function getConfig(configPath?: string): AppConfig {
  return AppConfig.get(configPath);
}

export function clearConfigCache() {
  AppConfig.clearCache();
}
