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

export type EnhancedLoggingAdminCompanyState = {
  components: string[];
  enabled: boolean;
  expiresAt: string | null;
  sessionIds: string[];
  ttlSeconds: number | null;
};

export type EnhancedLoggingAdminEnableInput = {
  companyId: string;
  components?: string[] | null;
  sessionIds?: string[] | null;
  ttlSeconds: number;
};

/**
 * Gives platform-admin GraphQL operations a single safe writer for runtime enhanced logging config.
 * It stores both an explicit expiry timestamp and a Redis TTL so diagnostic logging cannot remain
 * enabled indefinitely when an operator forgets to turn it back off.
 */
@injectable()
export class EnhancedLoggingAdminService {
  static readonly MAX_TTL_SECONDS = 86_400;
  static readonly MIN_TTL_SECONDS = 60;

  private static readonly disabledState: EnhancedLoggingAdminCompanyState = {
    components: [],
    enabled: false,
    expiresAt: null,
    sessionIds: [],
    ttlSeconds: null,
  };
  private static readonly fallbackLogger = pino({ level: "silent" });

  private readonly logger: PinoLogger;
  private readonly names: EnhancedLoggingNames;
  private readonly redisService: RedisService | null;

  constructor(
    @inject(RedisService) redisService?: RedisService,
    @inject(ApiLogger) logger?: ApiLogger,
    @inject(EnhancedLoggingNames) names: EnhancedLoggingNames = new EnhancedLoggingNames(),
  ) {
    this.redisService = redisService ?? null;
    this.logger = logger?.child({ component: "enhanced_logging_admin_service" })
      ?? EnhancedLoggingAdminService.fallbackLogger.child({ component: "enhanced_logging_admin_service" });
    this.names = names;
  }

  async enableCompany(input: EnhancedLoggingAdminEnableInput): Promise<EnhancedLoggingAdminCompanyState> {
    this.validateTtlSeconds(input.ttlSeconds);
    const client = await this.getRequiredClient();
    const expiresAt = new Date(Date.now() + (input.ttlSeconds * 1000));
    const configDocument = {
      components: this.normalizeStringArray(input.components),
      enabled: true,
      expiresAt: expiresAt.toISOString(),
      sessionIds: this.normalizeStringArray(input.sessionIds),
    };

    await client.set(
      this.names.getCompanyConfigKey(input.companyId),
      JSON.stringify(configDocument),
      { EX: input.ttlSeconds },
    );
    await this.publishInvalidation(input.companyId);

    return {
      components: configDocument.components,
      enabled: true,
      expiresAt: configDocument.expiresAt,
      sessionIds: configDocument.sessionIds,
      ttlSeconds: input.ttlSeconds,
    };
  }

  async disableCompany(companyId: string): Promise<EnhancedLoggingAdminCompanyState> {
    const client = await this.getRequiredClient();
    await client.del(this.names.getCompanyConfigKey(companyId));
    await this.publishInvalidation(companyId);

    return this.getDisabledState();
  }

  async getCompanyState(companyId: string): Promise<EnhancedLoggingAdminCompanyState> {
    if (!this.redisService) {
      return this.getDisabledState();
    }

    const client = await this.redisService.getClient();
    const key = this.names.getCompanyConfigKey(companyId);
    const rawConfig = await client.get(key);
    if (!rawConfig) {
      return this.getDisabledState();
    }

    const parsedConfig = this.parseConfig(companyId, rawConfig);
    if (parsedConfig.enabled !== true) {
      return this.getDisabledState();
    }

    const nowMilliseconds = Date.now();
    const expiresAtMilliseconds = this.resolveExpiresAtMilliseconds(parsedConfig.expiresAt);
    if (expiresAtMilliseconds !== null && expiresAtMilliseconds <= nowMilliseconds) {
      return this.getDisabledState();
    }

    const ttlSeconds = await this.resolveTtlSeconds(client, key, expiresAtMilliseconds, nowMilliseconds);

    return {
      components: this.normalizeStringArray(parsedConfig.components),
      enabled: true,
      expiresAt: expiresAtMilliseconds === null ? null : new Date(expiresAtMilliseconds).toISOString(),
      sessionIds: this.normalizeStringArray(parsedConfig.sessionIds),
      ttlSeconds,
    };
  }

  validateTtlSeconds(ttlSeconds: number): void {
    if (
      !Number.isInteger(ttlSeconds)
      || ttlSeconds < EnhancedLoggingAdminService.MIN_TTL_SECONDS
      || ttlSeconds > EnhancedLoggingAdminService.MAX_TTL_SECONDS
    ) {
      throw new Error(
        `TTL must be between ${EnhancedLoggingAdminService.MIN_TTL_SECONDS} and ${EnhancedLoggingAdminService.MAX_TTL_SECONDS} seconds.`,
      );
    }
  }

  private async getRequiredClient(): Promise<Awaited<ReturnType<RedisService["getClient"]>>> {
    if (!this.redisService) {
      throw new Error("Redis service is required to manage enhanced logging.");
    }

    return this.redisService.getClient();
  }

  private getDisabledState(): EnhancedLoggingAdminCompanyState {
    return { ...EnhancedLoggingAdminService.disabledState };
  }

  private normalizeStringArray(value: string[] | null | undefined | unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((entry) => {
      if (typeof entry !== "string") {
        return [];
      }

      const trimmedEntry = entry.trim();
      if (trimmedEntry.length === 0) {
        return [];
      }

      return [trimmedEntry];
    });
  }

  private parseConfig(companyId: string, rawConfig: string): EnhancedLoggingConfigDocument {
    try {
      return JSON.parse(rawConfig) as EnhancedLoggingConfigDocument;
    } catch (error) {
      this.logger.error({ companyId, err: error }, "failed to parse enhanced logging admin config");

      return { enabled: false };
    }
  }

  private async publishInvalidation(companyId: string): Promise<void> {
    const client = await this.getRequiredClient();
    await client.publish(this.names.getInvalidationChannel(), companyId);
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

  private async resolveTtlSeconds(
    client: Awaited<ReturnType<RedisService["getClient"]>>,
    key: string,
    expiresAtMilliseconds: number | null,
    nowMilliseconds: number,
  ): Promise<number | null> {
    const redisTtlSeconds = await client.ttl(key);
    if (redisTtlSeconds > 0) {
      return redisTtlSeconds;
    }
    if (expiresAtMilliseconds === null) {
      return null;
    }

    return Math.max(0, Math.ceil((expiresAtMilliseconds - nowMilliseconds) / 1000));
  }
}
