import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { QueuedAgentMessageScheduleService } from "../src/services/schedules/queued_agent_message_service.ts";

test("QueuedAgentMessageScheduleService enqueues one scheduled prompt and records the completed schedule run", async () => {
  const insertedQueuedRows: Array<Record<string, unknown>> = [];
  const insertedContentRows: Array<Record<string, unknown>> = [];
  const notifyQueuedSessionMessage = vi.fn(async () => undefined);
  const startRun = vi.fn(async () => ({ id: "run-1" }));
  const markDone = vi.fn(async () => ({ id: "run-1", status: "done" }));
  const transactionProvider = {
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      const tx = {
        select() {
          return {
            from() {
              return {
                innerJoin() {
                  return {
                    where: async () => [{
                        companyId: "company-1",
                        createdAt: new Date("2026-05-18T17:00:00.000Z"),
                        cronPattern: "0 9 * * 1-5",
                        enabled: true,
                        id: "schedule-1",
                        sessionId: "session-1",
                        shouldSteer: true,
                        text: "Check the deployment dashboard and summarize any blockers.",
                        timezone: "UTC",
                        updatedAt: new Date("2026-05-18T17:00:00.000Z"),
                      }],
                  };
                },
                async where() {
                  return [{ status: "queued" }];
                },
              };
            },
          };
        },
        update() {
          return {
            set() {
              return {
                async where() {
                  return [];
                },
              };
            },
          };
        },
        insert(table: unknown) {
          void table;
          return {
            async values(value: Record<string, unknown>) {
              if (Object.hasOwn(value, "sessionQueuedMessageId")) {
                insertedContentRows.push(value);
              } else {
                insertedQueuedRows.push(value);
              }

              return [];
            },
          };
        },
      };

      return callback(tx);
    },
  };
  const service = new QueuedAgentMessageScheduleService(
    {
      notifyQueuedSessionMessage,
    } as never,
    {
      markDone,
      markSkipped: vi.fn(async () => ({ id: "run-1", status: "skipped" })),
      markFailed: vi.fn(async () => ({ id: "run-1", status: "failed" })),
      startRun,
    } as never,
  );

  const result = await service.startScheduledMessage(transactionProvider as never, {
    bullmqJobId: "bullmq-job-1",
    companyId: "company-1",
    scheduleId: "schedule-1",
  });

  assert.equal(result?.scheduleId, "schedule-1");
  assert.equal(result?.sessionId, "session-1");
  assert.equal(insertedQueuedRows.length, 1);
  assert.equal(insertedContentRows.length, 1);
  assert.equal(insertedQueuedRows[0]?.principalType, "schedule");
  assert.equal(insertedContentRows[0]?.text, "Check the deployment dashboard and summarize any blockers.");
  assert.deepEqual(notifyQueuedSessionMessage.mock.calls[0], ["company-1", "session-1", true]);
  assert.deepEqual(markDone.mock.calls[0]?.[1], {
    companyId: "company-1",
    queuedMessageId: result?.queuedMessageId,
    runId: "run-1",
    sessionId: "session-1",
  });
});

test("QueuedAgentMessageScheduleService records a skipped run when the target session is archived", async () => {
  const markSkipped = vi.fn(async () => ({ id: "run-1", status: "skipped" }));
  const service = new QueuedAgentMessageScheduleService(
    {
      notifyQueuedSessionMessage: vi.fn(async () => undefined),
    } as never,
    {
      markDone: vi.fn(async () => ({ id: "run-1", status: "done" })),
      markSkipped,
      markFailed: vi.fn(async () => ({ id: "run-1", status: "failed" })),
      startRun: vi.fn(async () => ({ id: "run-1" })),
    } as never,
  );

  const transactionProvider = {
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      const tx = {
        select() {
          return {
            from() {
              return {
                innerJoin() {
                  return {
                    where: async () => [{
                        companyId: "company-1",
                        createdAt: new Date("2026-05-18T17:00:00.000Z"),
                        cronPattern: "0 9 * * 1-5",
                        enabled: true,
                        id: "schedule-1",
                        sessionId: "session-1",
                        shouldSteer: false,
                        text: "hello",
                        timezone: "UTC",
                        updatedAt: new Date("2026-05-18T17:00:00.000Z"),
                      }],
                  };
                },
                async where() {
                  return [{ status: "archived" }];
                },
              };
            },
          };
        },
      };

      return callback(tx);
    },
  };

  const result = await service.startScheduledMessage(transactionProvider as never, {
    companyId: "company-1",
    scheduleId: "schedule-1",
  });

  assert.equal(result, null);
  assert.deepEqual(markSkipped.mock.calls[0]?.[1], {
    companyId: "company-1",
    reason: "target session is archived",
    runId: "run-1",
  });
});
