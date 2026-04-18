import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { RoutineQueueNames } from "../src/services/routines/queue_names.ts";
import { RoutineTriggerQueueService } from "../src/services/routines/queue.ts";

const bullMqMocks = vi.hoisted(() => ({
  closeMock: vi.fn(async () => undefined),
  queueInstances: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    removeJobScheduler: ReturnType<typeof vi.fn>;
    upsertJobScheduler: ReturnType<typeof vi.fn>;
  }>,
  removeJobSchedulerMock: vi.fn(async () => undefined),
  upsertJobSchedulerMock: vi.fn(async () => undefined),
}));

const ioRedisMocks = vi.hoisted(() => ({
  instances: [] as Array<{ quit: ReturnType<typeof vi.fn> }>,
  quitMock: vi.fn(async () => undefined),
}));

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    close = bullMqMocks.closeMock;
    removeJobScheduler = bullMqMocks.removeJobSchedulerMock;
    upsertJobScheduler = bullMqMocks.upsertJobSchedulerMock;

    constructor() {
      bullMqMocks.queueInstances.push(this);
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
  bullMqMocks.closeMock.mockReset();
  bullMqMocks.queueInstances.length = 0;
  bullMqMocks.removeJobSchedulerMock.mockReset();
  bullMqMocks.upsertJobSchedulerMock.mockReset();
  ioRedisMocks.instances.length = 0;
  ioRedisMocks.quitMock.mockReset();
});

test("RoutineTriggerQueueService upserts cron triggers as BullMQ job schedulers", async () => {
  const service = new RoutineTriggerQueueService({
    redis: {
      host: "127.0.0.1",
      password: "redis-password",
      port: 6379,
      username: "redis-user",
    },
  } as Config, new RoutineQueueNames());

  await service.upsertCronTrigger({
    companyId: "company-1",
    cronPattern: "0 9 * * 1-5",
    id: "trigger-1",
    routineId: "routine-1",
    timezone: "America/Los_Angeles",
  });

  assert.equal(bullMqMocks.upsertJobSchedulerMock.mock.calls.length, 1);
  assert.deepEqual(bullMqMocks.upsertJobSchedulerMock.mock.calls[0], [
    "trigger-1",
    {
      immediately: false,
      pattern: "0 9 * * 1-5",
      tz: "America/Los_Angeles",
    },
    {
      data: {
        companyId: "company-1",
        routineId: "routine-1",
        triggerId: "trigger-1",
      },
      name: "run-routine",
      opts: {
        attempts: 3,
        backoff: {
          delay: 2_000,
          type: "exponential",
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    },
  ]);

  await service.removeTrigger("trigger-1");
  assert.deepEqual(bullMqMocks.removeJobSchedulerMock.mock.calls[0], ["trigger-1"]);

  await service.close();
  assert.equal(bullMqMocks.closeMock.mock.calls.length, 1);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 1);
});
