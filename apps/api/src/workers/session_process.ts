import { randomUUID } from "node:crypto";
import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import { Worker } from "bullmq";
import { Config } from "../config/schema.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { SessionPipelineLogger } from "../log/session_pipeline_logger.ts";
import { SessionProcessExecutionService } from "../services/agent/session/process/execution.ts";
import type { SessionWakeJobPayload } from "../services/agent/session/process/queue.ts";
import { SessionProcessQueuedNames } from "../services/agent/session/process/queued_names.ts";
import { drainLocalWork } from "./local_drain.ts";

/**
 * Owns the BullMQ consumer that turns wake jobs into one leased session-processing pass. Its scope
 * is queue-worker lifecycle only; the actual turn execution stays in SessionProcessExecutionService.
 */
@injectable()
export class SessionProcessWorker {
  private readonly config: Config;
  private readonly logger: SessionPipelineLogger;
  private readonly sessionProcessExecutionService: SessionProcessExecutionService;
  private readonly sessionProcessQueuedNames: SessionProcessQueuedNames;
  private readonly workerId: string;
  private readonly activeJobIds = new Set<string>();
  private connection?: IORedis;
  private worker?: Worker<SessionWakeJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(SessionProcessExecutionService) sessionProcessExecutionService: SessionProcessExecutionService,
    @inject(SessionProcessQueuedNames)
    sessionProcessQueuedNames: SessionProcessQueuedNames = new SessionProcessQueuedNames(),
  ) {
    this.config = config;
    this.workerId = randomUUID();
    this.logger = new SessionPipelineLogger(logger.child({
      worker: "session_process",
    }), {
      worker_id: this.workerId,
    });
    this.sessionProcessExecutionService = sessionProcessExecutionService;
    this.sessionProcessQueuedNames = sessionProcessQueuedNames;
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
    this.worker = new Worker<SessionWakeJobPayload>(
      this.sessionProcessQueuedNames.getWakeQueueName(),
      async (job) => {
        const activeJobId = String(job.id ?? `${job.data.companyId}:${job.data.sessionId}`);
        const traceId = String(job.id ?? activeJobId);
        const jobLogger = this.logger.child({
          companyId: job.data.companyId,
          session_id: job.data.sessionId,
          trace_id: traceId,
        });
        this.activeJobIds.add(activeJobId);
        try {
          jobLogger.debug({
            event: "session_wake_job_started",
          }, "processing session wake job");
          await this.sessionProcessExecutionService.execute(job.data.companyId, job.data.sessionId, {
            trace_id: traceId,
            worker_id: this.workerId,
          });
        } catch (error) {
          jobLogger.error({
            event: "session_wake_job_failed",
            companyId: job.data.companyId,
            err: error,
            sessionId: job.data.sessionId,
          }, "session wake job failed");
          throw error;
        } finally {
          this.activeJobIds.delete(activeJobId);
        }

        jobLogger.debug({
          event: "session_wake_job_completed",
        }, "completed session wake job");
      },
      {
        connection: this.connection,
        concurrency: this.config.workers.session_process.concurrency,
      },
    );
    this.worker.on("error", (error) => {
      this.logger.error({
        event: "session_process_worker_failed",
        error,
      }, "session process worker failed");
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
        workerName: "session_process",
      });
    } finally {
      if (connection) {
        await connection.quit();
      }
    }
  }
}
