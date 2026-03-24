import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { ApiLogger } from "../src/log/api_logger.ts";
import { WorkerBase } from "../src/workers/worker_base.ts";

type LoggedError = {
  bindings: Record<string, unknown>;
  arguments_: unknown[];
};

class WorkerBaseTestLoggerFactory {
  static create(loggedErrors: LoggedError[]): ApiLogger {
    return {
      child(bindings: Record<string, unknown>) {
        return {
          info() {
            return undefined;
          },
          debug() {
            return undefined;
          },
          error(...arguments_: unknown[]) {
            loggedErrors.push({
              bindings,
              arguments_,
            });
          },
        };
      },
    } as ApiLogger;
  }
}

/**
 * Provides a concrete worker implementation so the base class scheduling and error isolation
 * behavior can be verified without depending on a real background job.
 */
class TestWorkerBase extends WorkerBase {
  private readonly runImplementation: () => Promise<void> | void;

  constructor(logger: ApiLogger, runImplementation: () => Promise<void> | void) {
    super("test_worker", 1, logger);
    this.runImplementation = runImplementation;
  }

  protected override run(): Promise<void> | void {
    return this.runImplementation();
  }
}

afterEach(() => {
  vi.useRealTimers();
});

test("WorkerBase logs async worker failures instead of leaving unhandled rejections", async () => {
  vi.useFakeTimers();

  const loggedErrors: LoggedError[] = [];
  const worker = new TestWorkerBase(
    WorkerBaseTestLoggerFactory.create(loggedErrors),
    async () => {
      throw new Error("boom");
    },
  );

  worker.start();
  await vi.advanceTimersByTimeAsync(1000);
  worker.stop();

  assert.equal(loggedErrors.length, 1);
  assert.deepEqual(loggedErrors[0]?.bindings, {
    worker: "test_worker",
  });
  assert.deepEqual(loggedErrors[0]?.arguments_[0], {
    error: "boom",
  });
  assert.equal(loggedErrors[0]?.arguments_[1], "worker run failed");
});
