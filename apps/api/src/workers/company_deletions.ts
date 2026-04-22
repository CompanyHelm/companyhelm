import { randomUUID } from "node:crypto";
import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import type { Logger as PinoLogger } from "pino";
import { Worker } from "bullmq";
import { Config } from "../config/schema.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { CompanyDeletionQueueNames } from "../services/company_deletions/queue_names.ts";
import type { CompanyDeletionJobPayload } from "../services/company_deletions/queue.ts";
import { CompanyDeletionProcessor } from "../services/company_deletions/processor.ts";
import { drainLocalWork } from "./local_drain.ts";

/**
 * Consumes BullMQ company deletion jobs and delegates all destructive work to the processor after
 * taking a database lock on the durable request row.
 */
@injectable()
export class CompanyDeletionWorker {
  private readonly activeJobIds = new Set<string>();
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private readonly names: CompanyDeletionQueueNames;
  private readonly processor: CompanyDeletionProcessor;
  private readonly workerId = randomUUID();
  private connection?: IORedis;
  private worker?: Worker<CompanyDeletionJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(CompanyDeletionProcessor) processor: CompanyDeletionProcessor,
    @inject(CompanyDeletionQueueNames) names: CompanyDeletionQueueNames = new CompanyDeletionQueueNames(),
  ) {
    this.config = config;
    this.logger = logger.child({
      worker: "company_deletions",
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
    this.worker = new Worker<CompanyDeletionJobPayload>(
      this.names.getQueueName(),
      async (job) => {
        const activeJobId = String(job.id ?? job.data.requestId);
        this.activeJobIds.add(activeJobId);
        try {
          this.logger.debug({
            requestId: job.data.requestId,
          }, "processing company deletion job");
          await this.processor.process({
            requestId: job.data.requestId,
            workerId: this.workerId,
          });
        } finally {
          this.activeJobIds.delete(activeJobId);
        }
      },
      {
        connection: this.connection,
        concurrency: this.config.workers.company_deletions.concurrency,
      },
    );
    this.worker.on("error", (error) => {
      this.logger.error({
        error,
      }, "company deletion worker failed");
    });
  }

  async stop(): Promise<void> {
    const worker = this.worker;
    const connection = this.connection;
    this.worker = undefined;
    this.connection = undefined;

    try {
      await drainLocalWork({
        close: async () => {
          await worker?.close(false);
        },
        getActiveJobIds: () => [...this.activeJobIds],
        logger: this.logger,
        workerName: "company_deletions",
      });
    } finally {
      if (connection) {
        await connection.quit();
      }
    }
  }
}
