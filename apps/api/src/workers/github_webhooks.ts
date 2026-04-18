import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import type { Logger as PinoLogger } from "pino";
import { Worker } from "bullmq";
import { Config } from "../config/schema.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { GithubWebhookProcessor } from "../github/webhooks/processor.ts";
import { GithubWebhookQueueNames } from "../github/webhooks/queue_names.ts";
import type { GithubWebhookJobPayload } from "../github/webhooks/queue.ts";

/**
 * Consumes verified GitHub webhook jobs and delegates event-specific behavior to the processor.
 * Worker lifecycle and Redis connection ownership stay here so processor code remains focused on
 * durable application state changes.
 */
@injectable()
export class GithubWebhookWorker {
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private readonly names: GithubWebhookQueueNames;
  private readonly processor: GithubWebhookProcessor;
  private connection?: IORedis;
  private worker?: Worker<GithubWebhookJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(GithubWebhookProcessor) processor: GithubWebhookProcessor,
    @inject(GithubWebhookQueueNames) names: GithubWebhookQueueNames = new GithubWebhookQueueNames(),
  ) {
    this.config = config;
    this.logger = logger.child({
      worker: "github_webhooks",
    });
    this.names = names;
    this.processor = processor;
  }

  start(): void {
    if (this.worker) {
      return;
    }

    this.connection = new IORedis({
      host: this.config.redis.host,
      maxRetriesPerRequest: null,
      password: this.config.redis.password || undefined,
      port: this.config.redis.port,
      username: this.config.redis.username || undefined,
    });
    this.worker = new Worker<GithubWebhookJobPayload>(
      this.names.getQueueName(),
      async (job) => {
        this.logger.debug({
          deliveryId: job.data.deliveryId,
          eventName: job.data.eventName,
        }, "processing github webhook job");

        try {
          await this.processor.process(job.data);
        } catch (error) {
          this.logger.error({
            deliveryId: job.data.deliveryId,
            error,
            eventName: job.data.eventName,
          }, "github webhook job failed");
          throw error;
        }
      },
      {
        connection: this.connection,
        concurrency: this.config.workers.github_webhooks.concurrency,
      },
    );
    this.worker.on("error", (error) => {
      this.logger.error({
        error,
      }, "github webhook worker failed");
    });
  }

  async stop(): Promise<void> {
    const worker = this.worker;
    const connection = this.connection;
    this.worker = undefined;
    this.connection = undefined;

    await worker?.close();
    if (connection) {
      await connection.quit();
    }
  }
}
