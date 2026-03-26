import { RedisService } from "./service.ts";

/**
 * Wraps Redis access in one company namespace. Its scope is guaranteeing that every company-level
 * Redis operation uses the same key prefix so callers do not accidentally collide across tenants.
 */
export class RedisCompanyScopedService {
  private readonly companyId: string;
  private readonly redisService: RedisService;

  constructor(companyId: string, redisService: RedisService) {
    this.companyId = companyId;
    this.redisService = redisService;
  }

  async subscribe(key: string, listener: (message: string) => void): Promise<void> {
    const client = await this.redisService.getClient();
    const subscriber = client.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(this.scopeKey(key), listener);
  }

  private scopeKey(key: string): string {
    return `company:${this.companyId}:${key}`;
  }
}
