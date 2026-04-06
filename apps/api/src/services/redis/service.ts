import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { createClient } from "redis";
import { Config } from "../../config/schema.ts";
import { ApiLogger } from "../../log/api_logger.ts";

type RedisConnectionType = "command" | "subscriber";
type SharedRedisClient = ReturnType<typeof createClient>;

/**
 * Owns the shared Redis connection for the API process. Its scope is translating CompanyHelm's
 * runtime config into lazily connected shared Redis clients so the API process does not spawn a
 * fresh socket for each company-scoped publisher or GraphQL subscription.
 */
@injectable()
export class RedisService {
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private client?: SharedRedisClient;
  private connectPromise?: Promise<SharedRedisClient>;
  private subscriberClient?: SharedRedisClient;
  private subscriberConnectPromise?: Promise<SharedRedisClient>;

  constructor(
    @inject(Config) config: Config,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    this.config = config;
    this.logger = logger.child({
      component: "redis_service",
    });
  }

  async getClient(): Promise<SharedRedisClient> {
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

    this.registerErrorLogging(client, "command");
    this.client = client;
    this.connectPromise = client.connect().then(() => {
      this.connectPromise = undefined;
      return client;
    }).catch((error) => {
      this.logConnectionFailure(error, "command");
      this.client = undefined;
      this.connectPromise = undefined;
      throw error;
    });

    return this.connectPromise;
  }

  async getSubscriberClient(): Promise<SharedRedisClient> {
    if (this.subscriberClient?.isOpen) {
      return this.subscriberClient;
    }
    if (this.subscriberConnectPromise) {
      return this.subscriberConnectPromise;
    }

    const commandClient = await this.getClient();
    const subscriber = commandClient.duplicate();
    this.registerErrorLogging(subscriber, "subscriber");
    this.subscriberClient = subscriber;
    this.subscriberConnectPromise = subscriber.connect().then(() => {
      this.subscriberConnectPromise = undefined;
      return subscriber;
    }).catch((error) => {
      this.logConnectionFailure(error, "subscriber");
      this.subscriberClient = undefined;
      this.subscriberConnectPromise = undefined;
      throw error;
    });

    return this.subscriberConnectPromise;
  }

  private registerErrorLogging(client: SharedRedisClient, connectionType: RedisConnectionType): void {
    client.on("error", (error) => {
      this.logConnectionFailure(error, connectionType);
    });
  }

  private logConnectionFailure(error: unknown, connectionType: RedisConnectionType): void {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ERR max number of clients reached")) {
      this.logger.error({
        connectionType,
        err: error,
        redisHost: this.config.redis.host,
        redisPort: this.config.redis.port,
      }, "redis client limit reached");

      return;
    }

    this.logger.error({
      connectionType,
      err: error,
      redisHost: this.config.redis.host,
      redisPort: this.config.redis.port,
    }, "redis client failed");
  }
}
