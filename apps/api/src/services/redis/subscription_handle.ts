/**
 * Wraps one Redis subscription registration so higher-level code can dispose it without needing to
 * know whether the underlying channel used exact or pattern-based pub/sub commands.
 */
export class RedisSubscriptionHandle {
  private readonly unsubscribeCallback: () => Promise<void>;
  private isUnsubscribed = false;

  constructor(unsubscribeCallback: () => Promise<void>) {
    this.unsubscribeCallback = unsubscribeCallback;
  }

  async unsubscribe(): Promise<void> {
    if (this.isUnsubscribed) {
      return;
    }

    this.isUnsubscribed = true;
    await this.unsubscribeCallback();
  }
}
