import { inject, injectable } from "inversify";
import pino, { type Logger as PinoLogger } from "pino";
import { RedisService } from "../services/redis/service.ts";
import { ApiLogger } from "./api_logger.ts";
import { EnhancedLoggingNames } from "./enhanced_logging_names.ts";

type EnhancedLoggingConfigDocument = {
  components?: unknown;
  enabled?: unknown;
  expiresAt?: unknown;
  sessionIds?: unknown;
};

type EnhancedLoggingCompanyConfig = {
  components: string[];
  enabled: boolean;
  expiresAtMilliseconds: number | null;
  sessionIds: string[];
};

type CachedCompanyConfig = {
  config: EnhancedLoggingCompanyConfig | null;
  refreshAfterMilliseconds: number;
  refreshPromise: Promise<void> | null;
};

/**
 * Owns runtime-scoped enhanced logging toggles backed by Redis. The service keeps a short-lived
 * local cache, listens for Redis invalidation broadcasts, and exposes a synchronous gate so hot
 * logging paths can cheaply decide whether to emit expensive diagnostic entries.
 */
@injectable()
export class EnhancedLoggingService {
  static readonly CACHE_TTL_MILLISECONDS = 15_000;
  private static readonly fallbackLogger = pino({
    level: "silent",
  });

  private readonly logger: PinoLogger;
  private readonly names: EnhancedLoggingNames;
  private readonly redisService: RedisService | null;
  private readonly cachedConfigs = new Map<string, CachedCompanyConfig>();
  private invalidationSubscriptionStarted = false;

  constructor(
    @inject(RedisService) redisService?: RedisService,
    @inject(ApiLogger) logger?: ApiLogger,
    @inject(EnhancedLoggingNames) names: EnhancedLoggingNames = new EnhancedLoggingNames(),
  ) {
    this.redisService = redisService ?? null;
    this.logger = logger?.child({
      component: "enhanced_logging_service",
    }) ?? EnhancedLoggingService.fallbackLogger.child({
      component: "enhanced_logging_service",
    });
    this.names = names;
  }

  shouldLogEnhanced(companyId: string, diagnosticComponent: string, sessionId?: string): boolean {
    if (!this.redisService) {
      return false;
    }

    this.ensureInvalidationSubscription();
    this.refreshCompanyConfigIfNeeded(companyId);
    const cachedConfig = this.cachedConfigs.get(companyId)?.config;

    return this.matchesConfig(cachedConfig, diagnosticComponent, sessionId, Date.now());
  }

  async refreshCompanyConfig(companyId: string): Promise<void> {
    if (!this.redisService) {
      return;
    }

    const client = await this.redisService.getClient();
    const rawConfig = await client.get(this.names.getCompanyConfigKey(companyId));
    const parsedConfig = this.parseCompanyConfig(companyId, rawConfig);
    this.cachedConfigs.set(companyId, {
      config: parsedConfig,
      refreshAfterMilliseconds: Date.now() + EnhancedLoggingService.CACHE_TTL_MILLISECONDS,
      refreshPromise: null,
    });
  }

  invalidateCompany(companyId: string): void {
    this.cachedConfigs.delete(companyId);
  }

  private ensureInvalidationSubscription(): void {
    if (this.invalidationSubscriptionStarted || !this.redisService) {
      return;
    }

    this.invalidationSubscriptionStarted = true;
    void this.startInvalidationSubscription().catch((error) => {
      this.invalidationSubscriptionStarted = false;
      this.logger.error({
        err: error,
      }, "failed to start enhanced logging invalidation subscription");
    });
  }

  private async startInvalidationSubscription(): Promise<void> {
    const subscriber = await this.redisService?.getSubscriberClient();
    if (!subscriber) {
      return;
    }

    await subscriber.subscribe(this.names.getInvalidationChannel(), (message) => {
      const companyId = message.trim();
      if (companyId === "*") {
        this.cachedConfigs.clear();
        return;
      }
      if (companyId.length === 0) {
        return;
      }

      const shouldRefresh = this.cachedConfigs.has(companyId);
      this.invalidateCompany(companyId);
      if (shouldRefresh) {
        void this.refreshCompanyConfig(companyId).catch((error) => {
          this.logger.error({
            companyId,
            err: error,
          }, "failed to refresh enhanced logging config after invalidation");
        });
      }
    });
  }

  private refreshCompanyConfigIfNeeded(companyId: string): void {
    const now = Date.now();
    const cachedConfig = this.cachedConfigs.get(companyId);
    if (cachedConfig && cachedConfig.refreshAfterMilliseconds > now) {
      return;
    }
    if (cachedConfig?.refreshPromise) {
      return;
    }

    const refreshPromise = this.refreshCompanyConfig(companyId).catch((error) => {
      this.logger.error({
        companyId,
        err: error,
      }, "failed to refresh enhanced logging config");
      const staleConfig = this.cachedConfigs.get(companyId)?.config ?? cachedConfig?.config ?? null;
      this.cachedConfigs.set(companyId, {
        config: staleConfig,
        refreshAfterMilliseconds: Date.now() + EnhancedLoggingService.CACHE_TTL_MILLISECONDS,
        refreshPromise: null,
      });
    });

    this.cachedConfigs.set(companyId, {
      config: cachedConfig?.config ?? null,
      refreshAfterMilliseconds: now + EnhancedLoggingService.CACHE_TTL_MILLISECONDS,
      refreshPromise,
    });
  }

  private matchesConfig(
    config: EnhancedLoggingCompanyConfig | null | undefined,
    diagnosticComponent: string,
    sessionId: string | undefined,
    nowMilliseconds: number,
  ): boolean {
    if (!config?.enabled) {
      return false;
    }
    if (config.expiresAtMilliseconds !== null && config.expiresAtMilliseconds <= nowMilliseconds) {
      return false;
    }
    if (config.components.length > 0 && !config.components.includes(diagnosticComponent)) {
      return false;
    }
    if (config.sessionIds.length > 0 && !sessionId) {
      return false;
    }
    if (config.sessionIds.length > 0 && sessionId && !config.sessionIds.includes(sessionId)) {
      return false;
    }

    return true;
  }

  private parseCompanyConfig(
    companyId: string,
    rawConfig: string | null,
  ): EnhancedLoggingCompanyConfig | null {
    if (!rawConfig) {
      return null;
    }

    let parsedConfig: EnhancedLoggingConfigDocument;
    try {
      parsedConfig = JSON.parse(rawConfig) as EnhancedLoggingConfigDocument;
    } catch (error) {
      this.logger.error({
        companyId,
        err: error,
      }, "failed to parse enhanced logging config");
      return null;
    }

    return {
      components: this.normalizeStringArray(parsedConfig.components),
      enabled: parsedConfig.enabled === true,
      expiresAtMilliseconds: this.resolveExpiresAtMilliseconds(parsedConfig.expiresAt),
      sessionIds: this.normalizeStringArray(parsedConfig.sessionIds),
    };
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((entry) => {
      if (typeof entry !== "string") {
        return [];
      }

      const normalizedEntry = entry.trim();
      if (normalizedEntry.length === 0) {
        return [];
      }

      return [normalizedEntry];
    });
  }

  private resolveExpiresAtMilliseconds(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }
    if (typeof value !== "string") {
      return null;
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return null;
    }

    const numericValue = Number(trimmedValue);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return Math.trunc(numericValue);
    }

    const parsedDate = Date.parse(trimmedValue);
    if (!Number.isFinite(parsedDate)) {
      return null;
    }

    return parsedDate;
  }
}
