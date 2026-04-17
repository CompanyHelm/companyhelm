import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import type { Logger as PinoLogger } from "pino";
import { Worker } from "bullmq";
import { Config } from "../config/schema.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../db/app_runtime_transaction_provider.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { RoutineExecutionService } from "../services/routines/execution.ts";
import { RoutineQueueNames } from "../services/routines/queue_names.ts";
import type { RoutineTriggerJobPayload } from "../services/routines/types.ts";

/**
 * Consumes BullMQ routine trigger jobs and translates each cron fire into one routine execution
 * attempt under the target company context.
 */
@injectable()
export class RoutineTriggerWorker {
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private readonly names: RoutineQueueNames;
  private readonly routineExecutionService: RoutineExecutionService;
  private connection?: IORedis;
  private worker?: Worker<RoutineTriggerJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(RoutineExecutionService) routineExecutionService: RoutineExecutionService,
    @inject(RoutineQueueNames) names: RoutineQueueNames = new RoutineQueueNames(),
  ) {
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.config = config;
    this.logger = logger.child({
      worker: "routine_triggers",
    });
    this.names = names;
    this.routineExecutionService = routineExecutionService;
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
    this.worker = new Worker<RoutineTriggerJobPayload>(
      this.names.getTriggerQueueName(),
      async (job) => {
        this.logger.debug({
          companyId: job.data.companyId,
          routineId: job.data.routineId,
          triggerId: job.data.triggerId,
        }, "processing routine trigger job");

        const transactionProvider = new AppRuntimeTransactionProvider(
          this.appRuntimeDatabase,
          job.data.companyId,
        );
        await this.routineExecutionService.execute(transactionProvider, {
          bullmqJobId: job.id,
          companyId: job.data.companyId,
          routineId: job.data.routineId,
          source: "scheduled",
          triggerId: job.data.triggerId,
        });
      },
      {
        connection: this.connection,
        concurrency: this.config.workers.routine_triggers.concurrency,
      },
    );
    this.worker.on("error", (error) => {
      this.logger.error({
        error,
      }, "routine trigger worker failed");
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
