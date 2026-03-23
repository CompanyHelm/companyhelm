/**
 * Provides the minimal timed worker lifecycle shared by background jobs that need a simple
 * start/stop contract and a fixed execution cadence.
 */
export abstract class WorkerBase {
  private readonly intervalMilliseconds: number;
  private intervalHandle: ReturnType<typeof setInterval> | null;

  constructor(intervalSeconds: number) {
    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
      throw new Error("Worker interval must be a positive number of seconds.");
    }

    this.intervalMilliseconds = intervalSeconds * 1000;
    this.intervalHandle = null;
  }

  start(): void {
    if (this.intervalHandle) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      void this.run();
    }, this.intervalMilliseconds);
  }

  stop(): void {
    if (!this.intervalHandle) {
      return;
    }

    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  protected abstract run(): Promise<void> | void;
}
