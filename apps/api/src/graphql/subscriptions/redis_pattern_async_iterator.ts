import type { RedisCompanyScopedService } from "../../services/redis/company_scoped_service.ts";
import type { RedisSubscriptionHandle } from "../../services/redis/subscription_handle.ts";

type RedisPatternEvent = {
  channel: string;
  message: string;
};

/**
 * Bridges Redis pub/sub callbacks into the async-iterator shape required by GraphQL subscriptions.
 * It owns subscription teardown so websocket unsubscribe events release Redis listeners promptly.
 */
export class RedisPatternAsyncIterator implements AsyncIterableIterator<RedisPatternEvent> {
  private readonly redisCompanyScopedService: RedisCompanyScopedService;
  private readonly pattern: string;
  private readonly pendingEvents: RedisPatternEvent[] = [];
  private readonly pendingResolvers: Array<(result: IteratorResult<RedisPatternEvent>) => void> = [];
  private subscriptionHandle: RedisSubscriptionHandle | null = null;
  private startPromise: Promise<void> | null = null;
  private isClosed = false;

  constructor(redisCompanyScopedService: RedisCompanyScopedService, pattern: string) {
    this.redisCompanyScopedService = redisCompanyScopedService;
    this.pattern = pattern;
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<RedisPatternEvent> {
    return this;
  }

  async next(): Promise<IteratorResult<RedisPatternEvent>> {
    await this.start();

    if (this.pendingEvents.length > 0) {
      const value = this.pendingEvents.shift();
      if (value) {
        return {
          done: false,
          value,
        };
      }
    }

    if (this.isClosed) {
      return {
        done: true,
        value: undefined,
      };
    }

    return new Promise<IteratorResult<RedisPatternEvent>>((resolve) => {
      this.pendingResolvers.push(resolve);
    });
  }

  async return(): Promise<IteratorResult<RedisPatternEvent>> {
    await this.close();

    return {
      done: true,
      value: undefined,
    };
  }

  async throw(error?: unknown): Promise<IteratorResult<RedisPatternEvent>> {
    await this.close();
    throw error;
  }

  private async start(): Promise<void> {
    if (this.subscriptionHandle || this.isClosed) {
      return;
    }
    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this.redisCompanyScopedService.subscribePattern(
      this.pattern,
      (message, channel) => {
        this.pushEvent({
          channel,
          message,
        });
      },
    ).then((subscriptionHandle) => {
      this.subscriptionHandle = subscriptionHandle;
      this.startPromise = null;
    }).catch((error) => {
      this.startPromise = null;
      this.isClosed = true;
      this.flushResolvers();
      throw error;
    });

    return this.startPromise;
  }

  private pushEvent(event: RedisPatternEvent): void {
    if (this.isClosed) {
      return;
    }

    const resolve = this.pendingResolvers.shift();
    if (resolve) {
      resolve({
        done: false,
        value: event,
      });
      return;
    }

    this.pendingEvents.push(event);
  }

  private async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
    const subscriptionHandle = this.subscriptionHandle;
    this.subscriptionHandle = null;
    if (subscriptionHandle) {
      await subscriptionHandle.unsubscribe();
    }
    this.flushResolvers();
  }

  private flushResolvers(): void {
    while (this.pendingResolvers.length > 0) {
      const resolve = this.pendingResolvers.shift();
      if (!resolve) {
        continue;
      }

      resolve({
        done: true,
        value: undefined,
      });
    }
  }
}
