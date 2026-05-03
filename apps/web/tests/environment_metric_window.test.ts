import assert from "node:assert/strict";
import { test } from "node:test";
import { EnvironmentMetricWindow } from "../src/pages/environments/environment_metric_window";

test("creates the environment metrics query range for the previous hour", () => {
  const range = EnvironmentMetricWindow.createLastHour(new Date("2026-05-03T05:37:46.674Z"));

  assert.deepEqual(range, {
    endTime: "2026-05-03T05:37:46.674Z",
    startTime: "2026-05-03T04:37:46.674Z",
  });
});
