import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import type { Logger as PinoLogger } from "pino";
import { Worker } from "bullmq";
import { Config } from "../config/schema.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../db/app_runtime_transaction_provider.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { WorkflowQueueNames } from "../services/workflows/queue_names.ts";
import { WorkflowService } from "../services/workflows/service.ts";
import type { WorkflowTriggerJobPayload } from "../services/workflows/types.ts";

/**
 * Consumes BullMQ workflow trigger jobs and starts scheduled workflow runs under the job company.
 * The worker delegates validation and overlap skipping to WorkflowService.
 */
@injectable()
export class WorkflowTriggerWorker {
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private readonly names: WorkflowQueueNames;
  private readonly workflowService: WorkflowService;
  private connection?: IORedis;
  private worker?: Worker<WorkflowTriggerJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(WorkflowService) workflowService: WorkflowService,
    @inject(WorkflowQueueNames) names: WorkflowQueueNames = new WorkflowQueueNames(),
  ) {
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.config = config;
    this.logger = logger.child({
      worker: "workflow_triggers",
    });
    this.names = names;
    this.workflowService = workflowService;
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
    this.worker = new Worker<WorkflowTriggerJobPayload>(
      this.names.getTriggerQueueName(),
      async (job) => {
        this.logger.debug({
          companyId: job.data.companyId,
          triggerId: job.data.triggerId,
          workflowDefinitionId: job.data.workflowDefinitionId,
        }, "processing workflow trigger job");

        const transactionProvider = new AppRuntimeTransactionProvider(
          this.appRuntimeDatabase,
          job.data.companyId,
        );
        await this.workflowService.startScheduledWorkflowRun(transactionProvider, {
          bullmqJobId: job.id,
          companyId: job.data.companyId,
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
      }, "workflow trigger worker failed");
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
