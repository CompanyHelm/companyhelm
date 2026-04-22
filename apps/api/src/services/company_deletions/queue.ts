import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import { Queue } from "bullmq";
import { Config } from "../../config/schema.ts";
import { CompanyDeletionQueueNames } from "./queue_names.ts";

export type CompanyDeletionJobPayload = {
  requestId: string;
};

/**
 * Owns the producer side of company deletion jobs. The queue payload stays limited to the request
 * id so workers always reload the latest retry, lock, and company snapshot state from Postgres.
 */
@injectable()
export class CompanyDeletionQueueService {
  private readonly connection: IORedis;
  private readonly names: CompanyDeletionQueueNames;
  private readonly queue: Queue<CompanyDeletionJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(CompanyDeletionQueueNames) names: CompanyDeletionQueueNames = new CompanyDeletionQueueNames(),
  ) {
    this.names = names;
    this.connection = new IORedis({
      host: config.redis.host,
      maxRetriesPerRequest: null,
      password: config.redis.password || undefined,
      port: config.redis.port,
      username: config.redis.username || undefined,
    });
    this.queue = new Queue<CompanyDeletionJobPayload>(this.names.getQueueName(), {
      connection: this.connection,
    });
  }

  async enqueueRequest(requestId: string): Promise<void> {
    await this.queue.add(
      this.names.getJobName(),
      {
        requestId,
      },
      {
        attempts: 1,
        jobId: requestId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
