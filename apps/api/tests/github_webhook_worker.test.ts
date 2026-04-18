import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GithubWebhookQueueNames } from "../src/github/webhooks/queue_names.ts";
import { GithubWebhookWorker } from "../src/workers/github_webhooks.ts";

const workerMocks = vi.hoisted(() => ({
  closeMock: vi.fn(async () => undefined),
  onMock: vi.fn(),
  workerInstances: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    options: Record<string, unknown> | undefined;
    processor: (job: { data: { deliveryId: string; eventName: string; payload: string; receivedAt: string; signature: string } }) => Promise<void>;
  }>,
}));

const ioRedisMocks = vi.hoisted(() => ({
  instances: [] as Array<Record<string, unknown>>,
  quitMock: vi.fn(async () => undefined),
}));

vi.mock("bullmq", () => ({
  Worker: class MockWorker {
    close = workerMocks.closeMock;
    on = workerMocks.onMock;
    options;
    processor;

    constructor(
      queueName: string,
      processor: (job: { data: { deliveryId: string; eventName: string; payload: string; receivedAt: string; signature: string } }) => Promise<void>,
      options?: Record<string, unknown>,
    ) {
      void queueName;
      this.options = options;
      this.processor = processor;
      workerMocks.workerInstances.push(this);
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
  workerMocks.closeMock.mockReset();
  workerMocks.onMock.mockReset();
  workerMocks.workerInstances.length = 0;
  ioRedisMocks.instances.length = 0;
  ioRedisMocks.quitMock.mockReset();
});

test("GithubWebhookWorker starts one BullMQ worker and closes it cleanly", async () => {
  const worker = new GithubWebhookWorker(
    {
      redis: {
        host: "127.0.0.1",
        password: "redis-password",
        port: 6379,
        username: "redis-user",
      },
      workers: {
        github_webhooks: {
          concurrency: 6,
        },
      },
    } as Config,
    {
      child() {
        return {
          debug() {},
          error() {},
        };
      },
    } as never,
    {
      async process() {},
    } as never,
    new GithubWebhookQueueNames(),
  );

  worker.start();
  worker.start();

  assert.equal(workerMocks.workerInstances.length, 1);
  assert.equal(workerMocks.onMock.mock.calls.length, 1);
  assert.equal(workerMocks.workerInstances[0]?.options?.concurrency, 6);

  await worker.stop();

  assert.equal(workerMocks.closeMock.mock.calls.length, 1);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 1);
});

test("GithubWebhookWorker logs and rethrows failed webhook jobs", async () => {
  const debug = vi.fn();
  const error = vi.fn();
  const worker = new GithubWebhookWorker(
    {
      redis: {
        host: "127.0.0.1",
        password: "redis-password",
        port: 6379,
        username: "redis-user",
      },
      workers: {
        github_webhooks: {
          concurrency: 6,
        },
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
      async process() {
        throw new Error("processor failed");
      },
    } as never,
    new GithubWebhookQueueNames(),
  );

  worker.start();

  const workerInstance = workerMocks.workerInstances[0];
  assert.ok(workerInstance, "worker instance should be created");

  await assert.rejects(
    workerInstance.processor({
      data: {
        deliveryId: "delivery-1",
        eventName: "installation",
        payload: "{}",
        receivedAt: "2026-04-18T00:00:00.000Z",
        signature: "sha256=signature",
      },
    }),
    /processor failed/,
  );

  assert.equal(debug.mock.calls.length, 1);
  assert.equal(debug.mock.calls[0]?.[1], "processing github webhook job");
  assert.equal(error.mock.calls.length, 1);
  assert.equal(error.mock.calls[0]?.[1], "github webhook job failed");
  assert.equal(error.mock.calls[0]?.[0]?.deliveryId, "delivery-1");
  assert.equal(error.mock.calls[0]?.[0]?.eventName, "installation");

  await worker.stop();
});
