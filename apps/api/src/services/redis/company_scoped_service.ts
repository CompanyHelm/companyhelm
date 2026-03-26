import { inject, injectable } from "inversify";
import { RedisService } from "./service.ts";

/**
 * Wraps Redis access in one company namespace. Its scope is guaranteeing that every company-level
 * Redis operation uses the same key prefix so callers do not accidentally collide across tenants.
 */
@injectable()
export class RedisCompanyScopedService {
  private readonly companyId: string;
  private readonly redisService: RedisService;

  constructor(companyId: string, @inject(RedisService) redisService: RedisService) {
    this.companyId = companyId;
    this.redisService = redisService;
  }

  async publish(key: string): Promise<void> {
    const client = await this.redisService.getClient();
    await client.publish(this.scopeKey(key), "");
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
