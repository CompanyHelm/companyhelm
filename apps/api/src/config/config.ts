import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { parse } from "yaml";
import { configureLogger, getLogger } from "../logging/logger.js";
import { appConfigSchema, type AppConfig } from "./schema.js";

let cachedConfig: AppConfig | undefined;
let cachedConfigPath: string | undefined;
const envPlaceholderPattern = /\$\{([A-Z0-9_]+)\}/g;
const CONFIG_PATH_ENV = "COMPANYHELM_CONFIG_PATH";
const LOCAL_CONFIG_FILENAME = "local.yaml";

function normalizeProvidedConfigPath(configPath: string): string {
  const normalizedPath = configPath.trim();
  if (!normalizedPath) {
    throw new Error("Config path cannot be empty.");
  }
  return normalizedPath;
}

function resolveLocalConfigPath(cwd: string): string {
  return resolve(cwd, "config", LOCAL_CONFIG_FILENAME);
}

function resolveExplicitConfigPath(configPath: string, cwd: string): string {
  const normalizedPath = normalizeProvidedConfigPath(configPath);
  return isAbsolute(normalizedPath) ? normalizedPath : resolve(cwd, normalizedPath);
}

export function resolveConfigPath(configPath?: string, cwd: string = process.cwd()): string {
  const explicitPath = configPath?.trim() || process.env[CONFIG_PATH_ENV]?.trim();
  const resolvedConfigPath = explicitPath
    ? resolveExplicitConfigPath(explicitPath, cwd)
    : resolveLocalConfigPath(cwd);

  if (!existsSync(resolvedConfigPath)) {
    throw new Error(`No config file found at path "${resolvedConfigPath}".`);
  }

  return resolvedConfigPath;
}

function loadDotEnvForConfigPath(configPath: string) {
  if (basename(configPath) !== LOCAL_CONFIG_FILENAME) {
    return;
  }

  const logger = getLogger({ component: "config" });
  const dotEnvPath = resolve(dirname(configPath), "..", ".env.local");
  if (!existsSync(dotEnvPath)) {
    logger.debug({ dotEnvPath }, "No local .env file found for local config path.");
    return;
  }

  process.loadEnvFile(dotEnvPath);
  logger.debug({ dotEnvPath }, "Loaded environment variables from .env.local.");
}

export function resolveConfigPlaceholders(value: unknown, path = ""): unknown {
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
    return value.map((entry, index) => resolveConfigPlaceholders(entry, `${path}[${index}]`));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        resolveConfigPlaceholders(entry, path ? `${path}.${key}` : key),
      ]),
    );
  }

  return value;
}

export function loadConfigFromPath(configPath: string): AppConfig {
  const resolvedConfigPath = resolveConfigPath(configPath);
  loadDotEnvForConfigPath(resolvedConfigPath);
  const rawConfig = readFileSync(resolvedConfigPath, "utf8");
  const parsedConfig = parse(rawConfig) as unknown;
  const resolvedConfig = resolveConfigPlaceholders(parsedConfig);
  const config = appConfigSchema.parse(resolvedConfig);

  configureLogger({
    level: config.log_level,
    pretty: config.log_pretty,
  });
  getLogger({ component: "config" }).info(
    {
      configPath: resolvedConfigPath,
      logLevel: config.log_level,
      prettyLogs: config.log_pretty,
    },
    "Loaded application configuration.",
  );

  return config;
}

export function loadConfig(configPath?: string): AppConfig {
  const resolvedConfigPath = resolveConfigPath(configPath);
  return loadConfigFromPath(resolvedConfigPath);
}

export function getConfig(configPath?: string): AppConfig {
  const resolvedConfigPath = resolveConfigPath(configPath);
  if (!cachedConfig || cachedConfigPath !== resolvedConfigPath) {
    cachedConfig = loadConfigFromPath(resolvedConfigPath);
    cachedConfigPath = resolvedConfigPath;
  } else {
    getLogger({ component: "config" }).debug(
      { configPath: resolvedConfigPath },
      "Using cached application configuration.",
    );
  }

  return cachedConfig;
}

export function clearConfigCache() {
  cachedConfig = undefined;
  cachedConfigPath = undefined;
}

export type { AppConfig };
