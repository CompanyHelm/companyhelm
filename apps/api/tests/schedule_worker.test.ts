import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { ScheduleQueueNames } from "../src/services/schedules/queue_names.ts";
import { ScheduleWorker } from "../src/workers/schedules.ts";

const workerMocks = vi.hoisted(() => ({
  closeMock: vi.fn(async () => undefined),
  onMock: vi.fn(),
  workerInstances: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    options: Record<string, unknown> | undefined;
    processor: (job: {
      data: { companyId: string; scheduleId: string; scheduleType: "queued_agent_message" | "workflow" };
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
        data: { companyId: string; scheduleId: string; scheduleType: "queued_agent_message" | "workflow" };
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

test("ScheduleWorker starts scheduled workflow jobs under the job company", async () => {
  const startScheduledWorkflowRun = vi.fn(async () => undefined);
  const startScheduledMessage = vi.fn(async () => undefined);
  const debug = vi.fn();
  const error = vi.fn();
  const worker = new ScheduleWorker(
    {
      redis: {
        host: "127.0.0.1",
        password: "redis-password",
        port: 6379,
        username: "redis-user",
      },
      workers: {
        workflow_triggers: {
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
          info() {},
        };
      },
    } as never,
    {
      startScheduledWorkflowRun,
    } as never,
    {
      startScheduledMessage,
    } as never,
    new ScheduleQueueNames(),
  );

  worker.start();
  worker.start();

  assert.equal(workerMocks.workerInstances.length, 1);
  assert.equal(workerMocks.workerInstances[0]?.options?.concurrency, 3);

  await workerMocks.workerInstances[0]?.processor({
    data: {
      companyId: "company-1",
      scheduleId: "schedule-1",
      scheduleType: "workflow",
    },
    id: "bullmq-job-1",
  });

  const workflowCalls = startScheduledWorkflowRun.mock.calls as unknown[][];
  assert.deepEqual(workflowCalls[0]?.[1], {
    bullmqJobId: "bullmq-job-1",
    companyId: "company-1",
    triggerId: "schedule-1",
  });
  assert.equal(startScheduledMessage.mock.calls.length, 0);
  assert.equal(debug.mock.calls.length, 1);
  assert.equal(workerMocks.onMock.mock.calls.length, 1);

  await worker.stop();

  assert.equal(workerMocks.closeMock.mock.calls.length, 1);
  assert.deepEqual(workerMocks.closeMock.mock.calls[0] as unknown[] | undefined, [false]);
  assert.equal(ioRedisMocks.quitMock.mock.calls.length, 1);
});

test("ScheduleWorker dispatches queued agent message schedules to the queued-message service", async () => {
  const startScheduledWorkflowRun = vi.fn(async () => undefined);
  const startScheduledMessage = vi.fn(async () => undefined);
  const worker = new ScheduleWorker(
    {
      redis: {
        host: "127.0.0.1",
        password: "redis-password",
        port: 6379,
        username: "redis-user",
      },
      workers: {
        workflow_triggers: {
          concurrency: 1,
        },
      },
    } as Config,
    {} as never,
    {
      child() {
        return {
          debug() {},
          error() {},
          info() {},
        };
      },
    } as never,
    {
      startScheduledWorkflowRun,
    } as never,
    {
      startScheduledMessage,
    } as never,
    new ScheduleQueueNames(),
  );

  worker.start();

  await workerMocks.workerInstances[0]?.processor({
    data: {
      companyId: "company-2",
      scheduleId: "schedule-2",
      scheduleType: "queued_agent_message",
    },
    id: "bullmq-job-2",
  });

  const messageCalls = startScheduledMessage.mock.calls as unknown[][];
  assert.deepEqual(messageCalls[0]?.[1], {
    bullmqJobId: "bullmq-job-2",
    companyId: "company-2",
    scheduleId: "schedule-2",
  });
  assert.equal(startScheduledWorkflowRun.mock.calls.length, 0);
});
