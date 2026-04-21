import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { drainLocalWork } from "../src/workers/local_drain.ts";

test("drainLocalWork logs local active job ids while close is pending", async () => {
  vi.useFakeTimers();
  const info = vi.fn();
  const activeJobIds = new Set(["job-2", "job-1"]);
  let resolveClose: () => void = () => {};
  const closePromise = new Promise<void>((resolve) => {
    resolveClose = resolve;
  });

  const drainPromise = drainLocalWork({
    close: () => closePromise,
    getActiveJobIds: () => [...activeJobIds],
    intervalMilliseconds: 2_000,
    logger: { info } as never,
    workerName: "session_process",
  });

  await vi.advanceTimersByTimeAsync(2_000);
  activeJobIds.delete("job-1");
  await vi.advanceTimersByTimeAsync(2_000);
  resolveClose();
  await drainPromise;

  assert.ok(info.mock.calls.some((call) => call[0]?.activeJobs === 2));
  assert.ok(info.mock.calls.some((call) => call[0]?.activeJobs === 1));
  assert.ok(info.mock.calls.some((call) => call[1] === "worker drained"));

  vi.useRealTimers();
});

test("drainLocalWork does not log queue-wide progress when no local jobs are active", async () => {
  const info = vi.fn();

  await drainLocalWork({
    close: async () => {},
    getActiveJobIds: () => [],
    logger: { info } as never,
    workerName: "session_process",
  });

  assert.equal(
    info.mock.calls.filter((call) => call[1] === "waiting for worker jobs to drain").length,
    0,
  );
  assert.ok(info.mock.calls.some((call) => call[1] === "worker drained"));
});
