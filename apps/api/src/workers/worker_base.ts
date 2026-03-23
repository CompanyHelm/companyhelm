/**
 * Provides the minimal timed worker lifecycle shared by background jobs that need a simple
 * start/stop contract and a fixed execution cadence.
 */
export abstract class WorkerBase {
  private readonly workerName: string;
  private readonly intervalMilliseconds: number;
  private intervalHandle: ReturnType<typeof setInterval> | null;

  constructor(workerName: string, intervalSeconds: number) {
    const normalizedWorkerName = String(workerName || "").trim();
    if (!normalizedWorkerName) {
      throw new Error("Worker name is required.");
    }

    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
      throw new Error("Worker interval must be a positive number of seconds.");
    }

    this.workerName = normalizedWorkerName;
    this.intervalMilliseconds = intervalSeconds * 1000;
    this.intervalHandle = null;
  }

  start(): void {
    if (this.intervalHandle) {
      return;
    }

    console.log(`starting worker ${this.workerName}`);
    this.intervalHandle = setInterval(() => {
      console.log(`running worker ${this.workerName}`);
      void this.run();
    }, this.intervalMilliseconds);
  }

  stop(): void {
    if (!this.intervalHandle) {
      return;
    }

    console.log(`stopping worker ${this.workerName}`);
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  protected abstract run(): Promise<void> | void;
}
