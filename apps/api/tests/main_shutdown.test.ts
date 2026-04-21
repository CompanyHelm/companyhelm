import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { registerShutdownHandlers } from "../src/main.ts";

afterEach(() => {
  process.removeAllListeners("SIGINT");
  process.removeAllListeners("SIGTERM");
});

test("registerShutdownHandlers stops the server once for repeated shutdown signals", async () => {
  const error = vi.fn();
  const info = vi.fn();
  const stop = vi.fn(async () => {});

  registerShutdownHandlers({ stop } as never, { error, info } as never);

  process.emit("SIGTERM");
  process.emit("SIGINT");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(stop.mock.calls.length, 1);
  assert.ok(info.mock.calls.some((call) => call[1] === "shutdown signal received"));
  assert.ok(info.mock.calls.some((call) => call[1] === "shutdown completed"));
  assert.equal(error.mock.calls.length, 0);
});

test("registerShutdownHandlers records shutdown failures without throwing from the signal handler", async () => {
  const previousExitCode = process.exitCode;
  const error = vi.fn();
  const info = vi.fn();
  const stop = vi.fn(async () => {
    throw new Error("close failed");
  });

  registerShutdownHandlers({ stop } as never, { error, info } as never);

  process.emit("SIGTERM");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(process.exitCode, 1);
  assert.ok(error.mock.calls.some((call) => call[1] === "shutdown failed"));

  process.exitCode = previousExitCode;
});
