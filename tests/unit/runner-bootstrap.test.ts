import { expect, test } from "vitest";

import { resolveRunnerCliEntrypointArg } from "../../src/core/runner/runner-bootstrap.js";

test("uses the default bundled runner cli when the first argument is a flag", () => {
  expect(resolveRunnerCliEntrypointArg([
    process.execPath,
    "/tmp/runner-bootstrap.js",
    "--config-path",
    "/tmp/companyhelm",
    "start"
  ])).toBeNull();
});

test("accepts an explicit runner cli override path", () => {
  expect(resolveRunnerCliEntrypointArg([
    process.execPath,
    "/tmp/runner-bootstrap.js",
    "/tmp/custom-runner.js",
    "--config-path",
    "/tmp/companyhelm",
    "start"
  ])).toBe("/tmp/custom-runner.js");
});
