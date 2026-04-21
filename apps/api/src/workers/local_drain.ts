import type { Logger as PinoLogger } from "pino";

type DrainLogger = Pick<PinoLogger, "info">;

type DrainLocalWorkInput = {
  close: () => Promise<void>;
  getActiveJobIds: () => string[];
  intervalMilliseconds?: number;
  logger: DrainLogger;
  workerName: string;
};

const DEFAULT_DRAIN_LOG_INTERVAL_MILLISECONDS = 5_000;
const MAX_LOGGED_ACTIVE_JOB_IDS = 20;

/**
 * Logs local in-process work while a worker stops accepting new jobs and waits for already-owned
 * jobs to finish. The active-job source must be local process state, not queue-wide state.
 */
export async function drainLocalWork(input: DrainLocalWorkInput): Promise<void> {
  const startedAt = Date.now();
  const intervalMilliseconds = input.intervalMilliseconds ?? DEFAULT_DRAIN_LOG_INTERVAL_MILLISECONDS;
  let isClosed = false;

  const logProgress = () => {
    const activeJobIds = [...input.getActiveJobIds()].sort();
    if (activeJobIds.length === 0) {
      return;
    }

    input.logger.info({
      activeJobIds: activeJobIds.slice(0, MAX_LOGGED_ACTIVE_JOB_IDS),
      activeJobs: activeJobIds.length,
      elapsedMilliseconds: Date.now() - startedAt,
      worker: input.workerName,
    }, "waiting for worker jobs to drain");
  };

  logProgress();
  const progressTimer = setInterval(() => {
    if (!isClosed) {
      logProgress();
    }
  }, intervalMilliseconds);

  try {
    await input.close();
  } finally {
    isClosed = true;
    clearInterval(progressTimer);
  }

  input.logger.info({
    activeJobs: input.getActiveJobIds().length,
    elapsedMilliseconds: Date.now() - startedAt,
    worker: input.workerName,
  }, "worker drained");
}
