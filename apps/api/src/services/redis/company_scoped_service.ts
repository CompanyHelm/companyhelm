import { inject, injectable } from "inversify";
import { RedisService } from "./service.ts";
import { RedisSubscriptionHandle } from "./subscription_handle.ts";

type SubscriberRedisClient = Awaited<ReturnType<RedisService["getSubscriberClient"]>>;

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

  async subscribe(key: string, listener: (message: string, channel: string) => void): Promise<RedisSubscriptionHandle> {
    const subscriber = await this.getSubscriberClient();
    const scopedKey = this.scopeKey(key);
    const wrappedListener = (message: string, channel: string) => {
      listener(message, channel);
    };
    await subscriber.subscribe(scopedKey, wrappedListener);

    return new RedisSubscriptionHandle(async () => {
      await subscriber.unsubscribe(scopedKey, wrappedListener);
    });
  }

  async subscribePattern(
    pattern: string,
    listener: (message: string, channel: string) => void,
  ): Promise<RedisSubscriptionHandle> {
    const subscriber = await this.getSubscriberClient();
    const scopedPattern = this.scopeKey(pattern);
    const wrappedListener = (message: string, channel: string) => {
      listener(message, channel);
    };
    await subscriber.pSubscribe(scopedPattern, wrappedListener);

    return new RedisSubscriptionHandle(async () => {
      await subscriber.pUnsubscribe(scopedPattern, wrappedListener);
    });
  }

  async disconnect(): Promise<void> {
    return;
  }

  private scopeKey(key: string): string {
    return `company:${this.companyId}:${key}`;
  }

  private async getSubscriberClient(): Promise<SubscriberRedisClient> {
    return await this.redisService.getSubscriberClient();
  }
}
