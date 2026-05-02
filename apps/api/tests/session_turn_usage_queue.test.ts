import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { SessionTurnUsageQueueService } from "../src/services/agent/session/session_turn_usage_queue.ts";
import { SessionTurnUsageQueueNames } from "../src/services/agent/session/session_turn_usage_queue_names.ts";

const bullMqMocks = vi.hoisted(() => ({
  addMock: vi.fn(async () => undefined),
  closeMock: vi.fn(async () => undefined),
}));

const ioRedisMocks = vi.hoisted(() => ({
  quitMock: vi.fn(async () => undefined),
}));

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = bullMqMocks.addMock;
    close = bullMqMocks.closeMock;
  },
}));

vi.mock("ioredis", () => ({
  Redis: class MockIORedis {
    quit = ioRedisMocks.quitMock;
  },
  default: class MockIORedis {
    quit = ioRedisMocks.quitMock;
  },
}));

afterEach(() => {
  bullMqMocks.addMock.mockReset();
  bullMqMocks.closeMock.mockReset();
  ioRedisMocks.quitMock.mockReset();
});

test("SessionTurnUsageQueueService enqueues one deterministic job per turn", async () => {
  const service = new SessionTurnUsageQueueService({
    redis: {
      host: "127.0.0.1",
      password: "redis-password",
      port: 6379,
      username: "redis-user",
    },
  } as Config, new SessionTurnUsageQueueNames());

  await service.enqueueUsage({
    agentId: "agent-1",
    companyId: "company-1",
    credentialSource: "platform",
    costKind: "virtual",
    modelProviderCredentialId: "credential-1",
    recordedAt: new Date("2026-04-20T23:30:00.000Z"),
    sessionId: "session-1",
    turnId: "turn-1",
    usage: {
      totalTokens: 10,
    },
  });

  assert.deepEqual(bullMqMocks.addMock.mock.calls[0], [
    "record_usage",
    {
      agentId: "agent-1",
      companyId: "company-1",
      credentialSource: "platform",
      costKind: "virtual",
      modelProviderCredentialId: "credential-1",
      recordedAt: new Date("2026-04-20T23:30:00.000Z"),
      sessionId: "session-1",
      turnId: "turn-1",
      usage: {
        totalTokens: 10,
      },
    },
    {
      attempts: 5,
      backoff: {
        delay: 10000,
        type: "exponential",
      },
      jobId: "session-turn-usage-turn-1",
      removeOnComplete: {
        age: 86400,
        count: 10000,
      },
      removeOnFail: {
        age: 604800,
        count: 5000,
      },
    },
  ]);

  await service.close();

  assert.equal(bullMqMocks.closeMock.mock.calls.length, 1);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 1);
});
