import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import type { Logger as PinoLogger } from "pino";
import { Worker } from "bullmq";
import { Config } from "../config/schema.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../db/app_runtime_transaction_provider.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { ScheduleQueueNames } from "../services/schedules/queue_names.ts";
import { QueuedAgentMessageScheduleService } from "../services/schedules/queued_agent_message_service.ts";
import type { ScheduleJobPayload } from "../services/schedules/types.ts";
import { WorkflowService } from "../services/workflows/service.ts";
import { drainLocalWork } from "./local_drain.ts";

/**
 * Consumes the shared BullMQ schedule queue and dispatches each fired schedule to the appropriate
 * workflow or queued-message service under the schedule's company transaction scope.
 */
@injectable()
export class ScheduleWorker {
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private readonly names: ScheduleQueueNames;
  private readonly queuedAgentMessageScheduleService: QueuedAgentMessageScheduleService;
  private readonly workflowService: WorkflowService;
  private readonly activeJobIds = new Set<string>();
  private connection?: IORedis;
  private worker?: Worker<ScheduleJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(WorkflowService) workflowService: WorkflowService,
    @inject(QueuedAgentMessageScheduleService)
    queuedAgentMessageScheduleService: QueuedAgentMessageScheduleService,
    @inject(ScheduleQueueNames) names: ScheduleQueueNames = new ScheduleQueueNames(),
  ) {
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.config = config;
    this.logger = logger.child({ worker: "schedules" });
    this.names = names;
    this.queuedAgentMessageScheduleService = queuedAgentMessageScheduleService;
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
    this.worker = new Worker<ScheduleJobPayload>(
      this.names.getScheduleQueueName(),
      async (job) => {
        const activeJobId = String(job.id ?? `${job.data.companyId}:${job.data.scheduleId}`);
        this.activeJobIds.add(activeJobId);
        try {
          this.logger.debug({
            companyId: job.data.companyId,
            scheduleId: job.data.scheduleId,
            scheduleType: job.data.scheduleType,
          }, "processing schedule job");

          const transactionProvider = new AppRuntimeTransactionProvider(
            this.appRuntimeDatabase,
            job.data.companyId,
          );
          if (job.data.scheduleType === "workflow") {
            await this.workflowService.startScheduledWorkflowRun(transactionProvider, {
              bullmqJobId: job.id,
              companyId: job.data.companyId,
              triggerId: job.data.scheduleId,
            });
            return;
          }

          await this.queuedAgentMessageScheduleService.startScheduledMessage(transactionProvider, {
            bullmqJobId: job.id,
            companyId: job.data.companyId,
            scheduleId: job.data.scheduleId,
          });
        } finally {
          this.activeJobIds.delete(activeJobId);
        }
      },
      {
        connection: this.connection,
        concurrency: this.config.workers.workflow_triggers.concurrency,
      },
    );
    this.worker.on("error", (error) => {
      this.logger.error({ error }, "schedule worker failed");
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
        workerName: "schedules",
      });
    } finally {
      if (connection) {
        await connection.quit();
      }
    }
  }
}
