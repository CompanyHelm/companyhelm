import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { Config } from "../../config/schema.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { RedisService } from "./service.ts";

/**
 * Validates that the Redis instance used for BullMQ is configured to never evict keys before the
 * API starts. Its scope is a startup preflight so the queue layer fails fast instead of booting
 * against a cache-style Redis configuration that can silently discard jobs or locks.
 */
@injectable()
export class QueuePolicyValidator {
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private readonly redisService: RedisService;

  constructor(
    @inject(Config) config: Config,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(RedisService) redisService: RedisService,
  ) {
    this.config = config;
    this.logger = logger.child({
      component: "queue_policy_validator",
    });
    this.redisService = redisService;
  }

  async validateNoEvictionPolicy(): Promise<void> {
    const redisClient = await this.redisService.getClient();
    const infoReply = await redisClient.sendCommand(["INFO", "memory"]);
    const infoDocument = typeof infoReply === "string" ? infoReply : String(infoReply);
    const maxMemoryPolicy = this.extractMaxMemoryPolicy(infoDocument);
    if (!maxMemoryPolicy) {
      throw new Error("Redis INFO memory output did not include maxmemory_policy.");
    }
    if (maxMemoryPolicy === "noeviction") {
      return;
    }

    this.logger.error({
      maxmemoryPolicy: maxMemoryPolicy,
      redisHost: this.config.redis.host,
      redisPort: this.config.redis.port,
    }, "redis queue backend requires noeviction policy");
    throw new Error(`Redis maxmemory policy must be "noeviction" for BullMQ, got "${maxMemoryPolicy}".`);
  }

  private extractMaxMemoryPolicy(infoDocument: string): string | null {
    for (const infoLine of infoDocument.split(/\r?\n/u)) {
      if (infoLine.startsWith("maxmemory_policy:")) {
        return infoLine.slice("maxmemory_policy:".length).trim();
      }
    }

    return null;
  }
}
