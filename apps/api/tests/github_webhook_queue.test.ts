import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GithubWebhookQueueService } from "../src/github/webhooks/queue.ts";
import { GithubWebhookQueueNames } from "../src/github/webhooks/queue_names.ts";

const queueMocks = vi.hoisted(() => ({
  addMock: vi.fn(async () => undefined),
  closeMock: vi.fn(async () => undefined),
  instances: [] as Array<{
    name: string;
    options: Record<string, unknown> | undefined;
  }>,
}));

const ioRedisMocks = vi.hoisted(() => ({
  instances: [] as Array<Record<string, unknown>>,
  quitMock: vi.fn(async () => undefined),
}));

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = queueMocks.addMock;
    close = queueMocks.closeMock;

    constructor(name: string, options?: Record<string, unknown>) {
      queueMocks.instances.push({
        name,
        options,
      });
    }
  },
}));

vi.mock("ioredis", () => ({
  Redis: class MockIORedis {
    quit = ioRedisMocks.quitMock;

    constructor(options: Record<string, unknown>) {
      ioRedisMocks.instances.push(options);
    }
  },
}));

afterEach(() => {
  queueMocks.addMock.mockReset();
  queueMocks.closeMock.mockReset();
  queueMocks.instances.length = 0;
  ioRedisMocks.instances.length = 0;
  ioRedisMocks.quitMock.mockReset();
});

test("GithubWebhookQueueService enqueues deliveries with GitHub delivery id idempotency", async () => {
  const service = new GithubWebhookQueueService(
    {
      redis: {
        host: "127.0.0.1",
        password: "redis-password",
        port: 6379,
        username: "redis-user",
      },
    } as Config,
    new GithubWebhookQueueNames(),
  );

  await service.enqueueDelivery({
    deliveryId: "delivery-1",
    eventName: "installation",
    payload: "{}",
    receivedAt: "2026-04-18T00:00:00.000Z",
    signature: "sha256=signature",
  });

  assert.equal(queueMocks.instances.length, 1);
  assert.equal(queueMocks.instances[0]?.name, "github-webhooks");
  assert.equal(queueMocks.addMock.mock.calls.length, 1);
  const addCall = queueMocks.addMock.mock.calls[0] as unknown as [
    string,
    unknown,
    {
      attempts: number;
      jobId: string;
      removeOnFail: boolean;
    },
  ];
  assert.equal(addCall[0], "process-github-webhook");
  assert.equal(addCall[2].jobId, "delivery-1");
  assert.equal(addCall[2].attempts, 5);
  assert.equal(addCall[2].removeOnFail, false);

  await service.close();

  assert.equal(queueMocks.closeMock.mock.calls.length, 1);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 1);
});
