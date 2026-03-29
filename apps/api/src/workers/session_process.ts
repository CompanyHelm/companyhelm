import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import IORedis from "ioredis";
import { Worker } from "bullmq";
import { Config } from "../config/schema.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { SessionProcessExecutionService } from "../services/agent/session/process/execution.ts";
import type { SessionWakeJobPayload } from "../services/agent/session/process/queue.ts";
import { SessionProcessQueuedNames } from "../services/agent/session/process/queued_names.ts";

/**
 * Owns the BullMQ consumer that turns wake jobs into one leased session-processing pass. Its scope
 * is queue-worker lifecycle only; the actual turn execution stays in SessionProcessExecutionService.
 */
@injectable()
export class SessionProcessWorker {
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private readonly sessionProcessExecutionService: SessionProcessExecutionService;
  private readonly sessionProcessQueuedNames: SessionProcessQueuedNames;
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
    this.logger = logger.child({
      worker: "session_process",
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
        this.logger.debug({
          companyId: job.data.companyId,
          sessionId: job.data.sessionId,
        }, "processing session wake job");

        try {
          await this.sessionProcessExecutionService.execute(job.data.companyId, job.data.sessionId);
        } catch (error) {
          this.logger.error({
            companyId: job.data.companyId,
            err: error,
            sessionId: job.data.sessionId,
          }, "session wake job failed");
          throw error;
        }

        this.logger.debug({
          companyId: job.data.companyId,
          sessionId: job.data.sessionId,
        }, "completed session wake job");
      },
      {
        connection: this.connection,
      },
    );
    this.worker.on("error", (error) => {
      this.logger.error({
        error,
      }, "session process worker failed");
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
