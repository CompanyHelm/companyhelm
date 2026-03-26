import { inject, injectable } from "inversify";
import { createClient, type RedisClientType } from "redis";
import { Config } from "../../config/schema.ts";

/**
 * Owns the shared Redis connection for the API process. Its scope is translating CompanyHelm's
 * runtime config into one lazily connected Redis client so other services do not each create their
 * own sockets or duplicate connection setup rules.
 */
@injectable()
export class RedisService {
  private readonly config: Config;
  private client?: RedisClientType;
  private connectPromise?: Promise<RedisClientType>;

  constructor(@inject(Config) config: Config) {
    this.config = config;
  }

  async getClient(): Promise<RedisClientType> {
    if (this.client?.isOpen) {
      return this.client;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    const client = createClient({
      password: this.config.redis.password || undefined,
      socket: {
        host: this.config.redis.host,
        port: this.config.redis.port,
      },
      username: this.config.redis.username || undefined,
    });

    this.client = client;
    this.connectPromise = client.connect().then(() => {
      this.connectPromise = undefined;
      return client;
    }).catch((error) => {
      this.client = undefined;
      this.connectPromise = undefined;
      throw error;
    });

    return this.connectPromise;
  }
}
