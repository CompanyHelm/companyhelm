import type { Logger as PinoLogger } from "pino";
import { ApiLogger } from "../log/api_logger.ts";

/**
 * Provides the minimal timed worker lifecycle shared by background jobs that need a simple
 * start/stop contract and a fixed execution cadence.
 */
export abstract class WorkerBase {
  private readonly workerName: string;
  private readonly intervalMilliseconds: number;
  private readonly logger: PinoLogger;
  private intervalHandle: ReturnType<typeof setInterval> | null;

  constructor(workerName: string, intervalSeconds: number, logger: ApiLogger) {
    if (workerName.trim().length === 0) {
      throw new Error("Worker name is required.");
    }

    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
      throw new Error("Worker interval must be a positive number of seconds.");
    }

    this.workerName = workerName;
    this.intervalMilliseconds = intervalSeconds * 1000;
    this.logger = logger.child({
      worker: workerName,
    });
    this.intervalHandle = null;
  }

  start(): void {
    if (this.intervalHandle) {
      return;
    }

    this.logger.info("starting worker");
    this.intervalHandle = setInterval(() => {
      this.logger.debug("running worker");
      void this.run();
    }, this.intervalMilliseconds);
  }

  stop(): void {
    if (!this.intervalHandle) {
      return;
    }

    this.logger.info("stopping worker");
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  protected getLogger(): PinoLogger {
    return this.logger;
  }

  protected abstract run(): Promise<void> | void;
}
