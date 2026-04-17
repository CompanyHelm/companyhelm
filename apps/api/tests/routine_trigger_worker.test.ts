import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { RoutineQueueNames } from "../src/services/routines/queue_names.ts";
import { RoutineTriggerWorker } from "../src/workers/routine_triggers.ts";

const workerMocks = vi.hoisted(() => ({
  closeMock: vi.fn(async () => undefined),
  onMock: vi.fn(),
  workerInstances: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    options: Record<string, unknown> | undefined;
    processor: (job: {
      data: { companyId: string; routineId: string; triggerId: string };
      id?: string;
    }) => Promise<void>;
  }>,
}));

const ioRedisMocks = vi.hoisted(() => ({
  instances: [] as Array<{ quit: ReturnType<typeof vi.fn> }>,
  quitMock: vi.fn(async () => undefined),
}));

vi.mock("bullmq", () => ({
  Worker: class MockWorker {
    close = workerMocks.closeMock;
    on = workerMocks.onMock;
    options: Record<string, unknown> | undefined;
    processor;

    constructor(
      queueName: string,
      processor: (job: {
        data: { companyId: string; routineId: string; triggerId: string };
        id?: string;
      }) => Promise<void>,
      options?: Record<string, unknown>,
    ) {
      void queueName;
      this.options = options;
      this.processor = processor;
      workerMocks.workerInstances.push(this);
    }
  },
}));

vi.mock("ioredis", () => {
  class MockIORedis {
    quit = ioRedisMocks.quitMock;

    constructor() {
      ioRedisMocks.instances.push(this);
    }
  }

  return {
    default: MockIORedis,
    Redis: MockIORedis,
  };
});

afterEach(() => {
  workerMocks.closeMock.mockReset();
  workerMocks.onMock.mockReset();
  workerMocks.workerInstances.length = 0;
  ioRedisMocks.instances.length = 0;
  ioRedisMocks.quitMock.mockReset();
});

test("RoutineTriggerWorker executes scheduled routine jobs under the job company", async () => {
  const execute = vi.fn(async () => undefined);
  const debug = vi.fn();
  const error = vi.fn();
  const worker = new RoutineTriggerWorker(
    {
      redis: {
        host: "127.0.0.1",
        password: "redis-password",
        port: 6379,
        username: "redis-user",
      },
      workers: {
        routine_triggers: {
          concurrency: 3,
        },
      },
    } as Config,
    {} as never,
    {
      child() {
        return {
          debug,
          error,
        };
      },
    } as never,
    {
      execute,
    } as never,
    new RoutineQueueNames(),
  );

  worker.start();
  worker.start();

  assert.equal(workerMocks.workerInstances.length, 1);
  assert.equal(workerMocks.workerInstances[0]?.options?.concurrency, 3);

  await workerMocks.workerInstances[0]?.processor({
    data: {
      companyId: "company-1",
      routineId: "routine-1",
      triggerId: "trigger-1",
    },
    id: "bullmq-job-1",
  });

  assert.equal(debug.mock.calls.length, 1);
  assert.equal(execute.mock.calls.length, 1);
  const executeCalls = execute.mock.calls as unknown[][];
  assert.deepEqual(executeCalls[0]?.[1], {
    bullmqJobId: "bullmq-job-1",
    companyId: "company-1",
    routineId: "routine-1",
    source: "scheduled",
    triggerId: "trigger-1",
  });
  assert.equal(workerMocks.onMock.mock.calls.length, 1);

  await worker.stop();

  assert.equal(workerMocks.closeMock.mock.calls.length, 1);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 1);
});
