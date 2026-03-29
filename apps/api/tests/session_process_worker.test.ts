import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { SessionProcessWorker } from "../src/workers/session_process.ts";
import { SessionProcessQueuedNames } from "../src/services/agent/session/process/queued_names.ts";

const workerMocks = vi.hoisted(() => ({
  closeMock: vi.fn(async () => undefined),
  onMock: vi.fn(),
  workerInstances: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    processor: (job: { data: { companyId: string; sessionId: string } }) => Promise<void>;
  }>,
}));

const ioRedisMocks = vi.hoisted(() => ({
  quitMock: vi.fn(async () => undefined),
  instances: [] as Array<{ quit: ReturnType<typeof vi.fn> }>,
}));

vi.mock("bullmq", () => ({
  Worker: class MockWorker {
    close = workerMocks.closeMock;
    on = workerMocks.onMock;
    processor;

    constructor(
      queueName: string,
      processor: (job: { data: { companyId: string; sessionId: string } }) => Promise<void>,
    ) {
      void queueName;
      this.processor = processor;
      workerMocks.workerInstances.push(this);
    }
  },
}));

vi.mock("ioredis", () => ({
  default: class MockIORedis {
    quit = ioRedisMocks.quitMock;

    constructor() {
      ioRedisMocks.instances.push(this);
    }
  },
}));

afterEach(() => {
  workerMocks.closeMock.mockReset();
  workerMocks.onMock.mockReset();
  workerMocks.workerInstances.length = 0;
  ioRedisMocks.quitMock.mockReset();
  ioRedisMocks.instances.length = 0;
});

test("SessionProcessWorker starts one BullMQ worker and closes it cleanly", async () => {
  const worker = new SessionProcessWorker(
    {
      redis: {
        host: "127.0.0.1",
        password: "redis-password",
        port: 6379,
        username: "redis-user",
      },
    } as Config,
    {
      child() {
        return {
          error() {},
        };
      },
    } as never,
    {
      async execute() {},
    } as never,
    new SessionProcessQueuedNames(),
  );

  worker.start();
  worker.start();

  assert.equal(workerMocks.workerInstances.length, 1);
  assert.equal(workerMocks.onMock.mock.calls.length, 1);

  await worker.stop();

  assert.equal(workerMocks.closeMock.mock.calls.length, 1);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 1);
});

test("SessionProcessWorker logs and rethrows failed wake jobs with company and session context", async () => {
  const debug = vi.fn();
  const error = vi.fn();
  const worker = new SessionProcessWorker(
    {
      redis: {
        host: "127.0.0.1",
        password: "redis-password",
        port: 6379,
        username: "redis-user",
      },
    } as Config,
    {
      child() {
        return {
          debug,
          error,
        };
      },
    } as never,
    {
      async execute() {
        throw new Error("prompt execution failed");
      },
    } as never,
    new SessionProcessQueuedNames(),
  );

  worker.start();

  const workerInstance = workerMocks.workerInstances[0];
  assert.ok(workerInstance, "worker instance should be created");

  await assert.rejects(
    workerInstance.processor({
      data: {
        companyId: "company-1",
        sessionId: "session-1",
      },
    }),
    /prompt execution failed/,
  );

  assert.equal(debug.mock.calls.length, 1);
  assert.equal(
    debug.mock.calls[0]?.[1],
    "processing session wake job",
  );
  assert.equal(error.mock.calls.length, 1);
  assert.equal(
    error.mock.calls[0]?.[1],
    "session wake job failed",
  );
  assert.equal(error.mock.calls[0]?.[0]?.companyId, "company-1");
  assert.equal(error.mock.calls[0]?.[0]?.sessionId, "session-1");

  await worker.stop();
});
