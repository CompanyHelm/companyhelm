import assert from "node:assert/strict";
import { test } from "node:test";
import { RunnerCli } from "../src/runner_cli.js";
import type { RunnerIo } from "../src/runner_io_interface.js";

class CapturingRunnerIo implements RunnerIo {
  readonly errors: string[] = [];
  readonly lines: string[] = [];

  writeLine(message: string): void {
    this.lines.push(message);
  }

  writeError(message: string): void {
    this.errors.push(message);
  }
}

test("start command reports the configured runner connection target", async () => {
  const io = new CapturingRunnerIo();
  const originalToken = process.env.COMPANYHELM_RUNNER_TOKEN;
  try {
    process.env.COMPANYHELM_RUNNER_TOKEN = "runner-token";
    await new RunnerCli(io).run([
      "node",
      "companyhelm-runner",
      "start",
      "--server-url",
      "http://localhost:4000",
    ]);
  } finally {
    if (originalToken === undefined) {
      delete process.env.COMPANYHELM_RUNNER_TOKEN;
    } else {
      process.env.COMPANYHELM_RUNNER_TOKEN = originalToken;
    }
  }

  assert.equal(io.errors.length, 0);
  assert.deepEqual(io.lines, [
    "CompanyHelm runner package is installed.",
    "Server URL: http://localhost:4000",
    "Token environment: configured",
  ]);
});

test("status command confirms runner installation", async () => {
  const io = new CapturingRunnerIo();
  await new RunnerCli(io).run(["node", "companyhelm-runner", "status"]);

  assert.equal(io.errors.length, 0);
  assert.deepEqual(io.lines, ["CompanyHelm runner CLI is installed."]);
});
