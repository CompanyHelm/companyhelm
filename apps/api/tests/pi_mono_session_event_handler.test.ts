import assert from "node:assert/strict";
import { test } from "vitest";
import { PiMonoSessionEventHandler } from "../src/services/agent/session/pi-mono/session_event_handler.ts";

class PiMonoSessionEventHandlerTestHarness {
  static createTransactionProviderMock() {
    const updates: Array<Record<string, unknown>> = [];

    return {
      updates,
      transactionProvider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
          return callback({
            update() {
              return {
                set(value: Record<string, unknown>) {
                  updates.push(value);
                  return {
                    async where() {
                      return undefined;
                    },
                  };
                },
              };
            },
          });
        },
      },
    };
  }
}

test("PiMonoSessionEventHandler marks the session running on turn start", async () => {
  const transactionProvider = PiMonoSessionEventHandlerTestHarness.createTransactionProviderMock();
  const handler = new PiMonoSessionEventHandler(
    transactionProvider.transactionProvider as never,
    "session-1",
  );

  await handler.handle({
    type: "turn_start",
  });

  assert.equal(transactionProvider.updates.length, 1);
  assert.equal(transactionProvider.updates[0]?.status, "running");
  assert.ok(transactionProvider.updates[0]?.updated_at instanceof Date);
});

test("PiMonoSessionEventHandler marks the session stopped on turn end", async () => {
  const transactionProvider = PiMonoSessionEventHandlerTestHarness.createTransactionProviderMock();
  const handler = new PiMonoSessionEventHandler(
    transactionProvider.transactionProvider as never,
    "session-1",
  );

  await handler.handle({
    type: "turn_end",
  });

  assert.equal(transactionProvider.updates.length, 1);
  assert.equal(transactionProvider.updates[0]?.status, "stopped");
  assert.ok(transactionProvider.updates[0]?.updated_at instanceof Date);
});
