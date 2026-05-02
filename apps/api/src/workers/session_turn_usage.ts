import { Worker } from "bullmq";
import { Redis as IORedis } from "ioredis";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { Config } from "../config/schema.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../db/app_runtime_transaction_provider.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { SessionTurnUsageProcessor } from "../services/agent/session/session_turn_usage_processor.ts";
import type { SessionTurnUsageJobPayload } from "../services/agent/session/session_turn_usage_queue.ts";
import { SessionTurnUsageQueueNames } from "../services/agent/session/session_turn_usage_queue_names.ts";
import { drainLocalWork } from "./local_drain.ts";

/**
 * Consumes best-effort turn usage jobs and applies the durable accounting write path outside the
 * live session critical path. Its scope is worker lifecycle, retry handoff, and terminal failure
 * logging after BullMQ exhausts the configured retry budget.
 */
@injectable()
export class SessionTurnUsageWorker {
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private readonly names: SessionTurnUsageQueueNames;
  private readonly processor: SessionTurnUsageProcessor;
  private readonly activeJobIds = new Set<string>();
  private connection?: IORedis;
  private worker?: Worker<SessionTurnUsageJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(SessionTurnUsageProcessor)
    processor: SessionTurnUsageProcessor = new SessionTurnUsageProcessor(),
    @inject(SessionTurnUsageQueueNames)
    names: SessionTurnUsageQueueNames = new SessionTurnUsageQueueNames(),
  ) {
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.config = config;
    this.logger = logger.child({ worker: "session_turn_usage" });
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
    this.worker = new Worker<SessionTurnUsageJobPayload>(
      this.names.getQueueName(),
      async (job) => {
        const activeJobId = String(job.id ?? this.names.getRecordJobId(job.data.turnId));
        this.activeJobIds.add(activeJobId);
        try {
          await this.processor.processUsage(
            new AppRuntimeTransactionProvider(this.appRuntimeDatabase, job.data.companyId),
            job.data,
          );
        } finally {
          this.activeJobIds.delete(activeJobId);
        }
      },
      {
        connection: this.connection,
        concurrency: this.config.workers.llm_usage.concurrency,
      },
    );
    this.worker.on("error", (error) => {
      this.logger.error({ error }, "session turn usage worker failed");
    });
    this.worker.on("failed", (job, error) => {
      const maxAttempts = job?.opts.attempts ?? 1;
      const attemptsMade = job?.attemptsMade ?? 0;
      if (attemptsMade < maxAttempts) {
        return;
      }

      this.logger.error({
        attemptsMade,
        companyId: job?.data.companyId,
        error,
        session_id: job?.data.sessionId,
        turn_id: job?.data.turnId,
      }, "session turn usage job failed permanently");
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
        workerName: "session_turn_usage",
      });
    } finally {
      if (connection) {
        await connection.quit();
      }
    }
  }
}
