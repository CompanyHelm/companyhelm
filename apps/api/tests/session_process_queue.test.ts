import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { SessionProcessQueuedNames } from "../src/services/agent/session/process/queued_names.ts";
import { SessionProcessQueueService } from "../src/services/agent/session/process/queue.ts";

const bullMqMocks = vi.hoisted(() => ({
  addMock: vi.fn(async () => undefined),
  closeMock: vi.fn(async () => undefined),
  queueInstances: [] as Array<{ add: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }>,
}));

const ioRedisMocks = vi.hoisted(() => ({
  quitMock: vi.fn(async () => undefined),
  instances: [] as Array<{ quit: ReturnType<typeof vi.fn> }>,
}));

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = bullMqMocks.addMock;
    close = bullMqMocks.closeMock;

    constructor() {
      bullMqMocks.queueInstances.push(this);
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
  bullMqMocks.addMock.mockReset();
  bullMqMocks.closeMock.mockReset();
  bullMqMocks.queueInstances.length = 0;
  ioRedisMocks.quitMock.mockReset();
  ioRedisMocks.instances.length = 0;
});

test("SessionProcessQueueService enqueues one deterministic wake job per session", async () => {
  const service = new SessionProcessQueueService({
    redis: {
      host: "127.0.0.1",
      password: "redis-password",
      port: 6379,
      username: "redis-user",
    },
  } as Config, new SessionProcessQueuedNames());

  await service.enqueueSessionWake("company-1", "session-1");

  assert.equal(bullMqMocks.addMock.mock.calls.length, 1);
  assert.deepEqual(bullMqMocks.addMock.mock.calls[0], [
    "wake",
    {
      companyId: "company-1",
      sessionId: "session-1",
    },
    {
      jobId: "company__company-1__session__session-1__wake",
      removeOnComplete: true,
      removeOnFail: true,
    },
  ]);

  await service.close();

  assert.equal(bullMqMocks.closeMock.mock.calls.length, 1);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 1);
});
