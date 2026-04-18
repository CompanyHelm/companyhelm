import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import { Queue } from "bullmq";
import { Config } from "../../config/schema.ts";
import { GithubWebhookQueueNames } from "./queue_names.ts";

export type GithubWebhookJobPayload = {
  deliveryId: string;
  eventName: string;
  payload: string;
  receivedAt: string;
  signature: string;
};

/**
 * Owns the durable BullMQ producer for verified GitHub webhook deliveries. GitHub may retry the
 * same delivery, so the queue uses the delivery id as the job id to keep processing idempotent at
 * the transport layer.
 */
@injectable()
export class GithubWebhookQueueService {
  private readonly connection: IORedis;
  private readonly names: GithubWebhookQueueNames;
  private readonly queue: Queue<GithubWebhookJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(GithubWebhookQueueNames) names: GithubWebhookQueueNames = new GithubWebhookQueueNames(),
  ) {
    this.names = names;
    this.connection = new IORedis({
      host: config.redis.host,
      maxRetriesPerRequest: null,
      password: config.redis.password || undefined,
      port: config.redis.port,
      username: config.redis.username || undefined,
    });
    this.queue = new Queue<GithubWebhookJobPayload>(this.names.getQueueName(), {
      connection: this.connection,
    });
  }

  async enqueueDelivery(payload: GithubWebhookJobPayload): Promise<void> {
    await this.queue.add(
      this.names.getJobName(),
      payload,
      {
        attempts: 5,
        backoff: {
          delay: 2_000,
          type: "exponential",
        },
        jobId: payload.deliveryId,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
