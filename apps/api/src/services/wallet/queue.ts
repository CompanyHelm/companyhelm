import { Queue } from "bullmq";
import { Redis as IORedis } from "ioredis";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { WalletRechargeQueueNames } from "./queue_names.ts";

export type WalletRechargeJobPayload = Record<string, never>;

/**
 * Owns the durable BullMQ scheduler that wakes subscription wallet recharges daily. Postgres
 * idempotency decides whether a company actually receives credit for the current period.
 */
@injectable()
export class WalletRechargeQueueService {
  private readonly connection: IORedis;
  private readonly names: WalletRechargeQueueNames;
  private readonly queue: Queue<WalletRechargeJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(WalletRechargeQueueNames) names: WalletRechargeQueueNames = new WalletRechargeQueueNames(),
  ) {
    this.names = names;
    this.connection = new IORedis({
      host: config.redis.host,
      maxRetriesPerRequest: null,
      password: config.redis.password || undefined,
      port: config.redis.port,
      username: config.redis.username || undefined,
    });
    this.queue = new Queue<WalletRechargeJobPayload>(this.names.getQueueName(), {
      connection: this.connection,
    });
  }

  async upsertDailyRechargeScheduler(): Promise<void> {
    await this.queue.upsertJobScheduler(
      this.names.getDailySchedulerId(),
      {
        immediately: false,
        pattern: "0 15 3 * * *",
        tz: "UTC",
      },
      {
        data: {},
        name: this.names.getRechargeJobName(),
        opts: {
          attempts: 5,
          backoff: 3,
          removeOnComplete: true,
          removeOnFail: 1000,
        },
      },
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
