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

  static captureConsole() {
    const infoLogs: unknown[] = [];
    const errorLogs: unknown[] = [];
    const originalInfo = console.info;
    const originalError = console.error;

    console.info = (...args: unknown[]) => {
      infoLogs.push(args);
    };
    console.error = (...args: unknown[]) => {
      errorLogs.push(args);
    };

    return {
      errorLogs,
      infoLogs,
      restore() {
        console.info = originalInfo;
        console.error = originalError;
      },
    };
  }
}

test("PiMonoSessionEventHandler marks the session running on agent start", async () => {
  const transactionProvider = PiMonoSessionEventHandlerTestHarness.createTransactionProviderMock();
  const handler = new PiMonoSessionEventHandler(
    transactionProvider.transactionProvider as never,
    "session-1",
  );

  await handler.handle({
    type: "agent_start",
  });

  assert.equal(transactionProvider.updates.length, 1);
  assert.equal(transactionProvider.updates[0]?.status, "running");
  assert.ok(transactionProvider.updates[0]?.updated_at instanceof Date);
});

test("PiMonoSessionEventHandler marks the session stopped on agent end", async () => {
  const transactionProvider = PiMonoSessionEventHandlerTestHarness.createTransactionProviderMock();
  const handler = new PiMonoSessionEventHandler(
    transactionProvider.transactionProvider as never,
    "session-1",
  );

  await handler.handle({
    type: "agent_end",
  });

  assert.equal(transactionProvider.updates.length, 1);
  assert.equal(transactionProvider.updates[0]?.status, "stopped");
  assert.ok(transactionProvider.updates[0]?.updated_at instanceof Date);
});

test("PiMonoSessionEventHandler ignores user message start and logs user message end", async () => {
  const transactionProvider = PiMonoSessionEventHandlerTestHarness.createTransactionProviderMock();
  const handler = new PiMonoSessionEventHandler(
    transactionProvider.transactionProvider as never,
    "session-1",
  );
  const consoleCapture = PiMonoSessionEventHandlerTestHarness.captureConsole();

  try {
    await handler.handle({
      type: "message_start",
      message: {
        role: "user",
      },
    });
    await handler.handle({
      type: "message_end",
      message: {
        role: "user",
      },
    });
  } finally {
    consoleCapture.restore();
  }

  assert.equal(transactionProvider.updates.length, 0);
  assert.equal(consoleCapture.errorLogs.length, 0);
  assert.equal(consoleCapture.infoLogs.length, 2);
  assert.deepEqual(
    (consoleCapture.infoLogs[0] as unknown[])[0],
    {
      event: {
        message: {
          role: "user",
        },
        type: "message_start",
      },
      logMessage: "ignoring pi mono user message start",
      sessionId: "session-1",
    },
  );
  assert.deepEqual(
    (consoleCapture.infoLogs[1] as unknown[])[0],
    {
      event: {
        message: {
          role: "user",
        },
        type: "message_end",
      },
      logMessage: "pi mono user message completed",
      sessionId: "session-1",
    },
  );
});

test("PiMonoSessionEventHandler error logs unhandled message roles", async () => {
  const transactionProvider = PiMonoSessionEventHandlerTestHarness.createTransactionProviderMock();
  const handler = new PiMonoSessionEventHandler(
    transactionProvider.transactionProvider as never,
    "session-1",
  );
  const consoleCapture = PiMonoSessionEventHandlerTestHarness.captureConsole();

  try {
    await handler.handle({
      type: "message_end",
      message: {
        role: "custom",
      },
    });
  } finally {
    consoleCapture.restore();
  }

  assert.equal(transactionProvider.updates.length, 0);
  assert.equal(consoleCapture.infoLogs.length, 0);
  assert.equal(consoleCapture.errorLogs.length, 1);
  assert.deepEqual(
    (consoleCapture.errorLogs[0] as unknown[])[0],
    {
      event: {
        message: {
          role: "custom",
        },
        type: "message_end",
      },
      logMessage: "unhandled pi mono message_end event",
      sessionId: "session-1",
    },
  );
});
