import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { SessionTurnUsageQueueNames } from "../src/services/agent/session/session_turn_usage_queue_names.ts";
import { SessionTurnUsageWorker } from "../src/workers/session_turn_usage.ts";

const workerMocks = vi.hoisted(() => ({
  closeMock: vi.fn(async () => undefined),
  onMock: vi.fn(),
  workerInstances: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    options: Record<string, unknown> | undefined;
    processor: (job: { data: { companyId: string; sessionId: string; turnId: string }; id?: string }) => Promise<void>;
  }>,
}));

const ioRedisMocks = vi.hoisted(() => ({
  quitMock: vi.fn(async () => undefined),
}));

vi.mock("bullmq", () => ({
  Worker: class MockWorker {
    close = workerMocks.closeMock;
    on = workerMocks.onMock;
    options: Record<string, unknown> | undefined;
    processor;

    constructor(
      _queueName: string,
      processor: (job: { data: { companyId: string; sessionId: string; turnId: string }; id?: string }) => Promise<void>,
      options?: Record<string, unknown>,
    ) {
      this.options = options;
      this.processor = processor;
      workerMocks.workerInstances.push(this);
    }
  },
}));

vi.mock("ioredis", () => {
  class MockIORedis {
    quit = ioRedisMocks.quitMock;
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
  ioRedisMocks.quitMock.mockReset();
});

test("SessionTurnUsageWorker starts one BullMQ worker and processes jobs with company context", async () => {
  const processUsage = vi.fn(async () => undefined);
  const worker = new SessionTurnUsageWorker(
    {
      redis: {
        host: "127.0.0.1",
        password: "redis-password",
        port: 6379,
        username: "redis-user",
      },
      workers: {
        llm_usage: {
          concurrency: 4,
        },
      },
    } as Config,
    {
      withCompanyContext: async (_companyId: string, callback: (tx: unknown) => Promise<void>) => callback({}),
    } as never,
    {
      child() {
        return {
          error() {},
          info() {},
        };
      },
    } as never,
    { processUsage } as never,
    new SessionTurnUsageQueueNames(),
  );

  worker.start();
  worker.start();

  assert.equal(workerMocks.workerInstances.length, 1);
  assert.equal(workerMocks.workerInstances[0]?.options?.concurrency, 4);

  await workerMocks.workerInstances[0]?.processor({
    data: {
      companyId: "company-1",
      sessionId: "session-1",
      turnId: "turn-1",
    },
    id: "job-1",
  });

  assert.equal(processUsage.mock.calls.length, 1);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 0);

  await worker.stop();

  assert.equal(workerMocks.closeMock.mock.calls.length, 1);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 1);
});
