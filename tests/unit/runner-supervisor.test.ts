import { expect, test } from "vitest";

import { RunnerSupervisor } from "../../src/core/runner/RunnerSupervisor.js";

test("builds runner launch args with the generated secret", () => {
  const supervisor = new RunnerSupervisor("/tmp/companyhelm");

  const args = supervisor.buildStartArgs({
    serverUrl: "127.0.0.1:50051",
    agentApiUrl: "127.0.0.1:50052",
    logPath: "/tmp/companyhelm/daemon.log",
    secret: "runner-secret",
    logLevel: "debug"
  });

  expect(args.command).toBe(process.execPath);
  expect(args.args[0]).toContain("@companyhelm/runner");
  expect(args.args).toContain("--daemon");
  expect(args.args).toContain("start");
  expect(args.args).toContain("--server-url");
  expect(args.args).toContain("127.0.0.1:50051");
  expect(args.args).toContain("--agent-api-url");
  expect(args.args).toContain("127.0.0.1:50052");
  expect(args.args).toContain("--log-path");
  expect(args.args).toContain("/tmp/companyhelm/daemon.log");
  expect(args.args).toContain("runner-secret");
  expect(args.args).toContain("--log-level");
  expect(args.args).toContain("DEBUG");
  expect(args.args).not.toContain("runner");
});

test("builds host auth setup args for the bundled runner cli", () => {
  const supervisor = new RunnerSupervisor("/tmp/companyhelm");

  const args = supervisor.buildUseHostAuthArgs();

  expect(args.command).toBe(process.execPath);
  expect(args.args[0]).toContain("@companyhelm/runner");
  expect(args.args.slice(1)).toEqual([
    "--config-path",
    "/tmp/companyhelm",
    "sdk",
    "codex",
    "use-host-auth"
  ]);
});

test("prefers an explicit runner cli override", () => {
  process.env.COMPANYHELM_RUNNER_CLI_PATH = "/tmp/custom-runner.js";

  const supervisor = new RunnerSupervisor("/tmp/companyhelm");
  const args = supervisor.buildStartArgs({
    serverUrl: "127.0.0.1:50051",
    agentApiUrl: "127.0.0.1:50052",
    logPath: "/tmp/companyhelm/daemon.log",
    secret: "runner-secret"
  });

  expect(args.command).toBe(process.execPath);
  expect(args.args[0]).toBe("/tmp/custom-runner.js");

  delete process.env.COMPANYHELM_RUNNER_CLI_PATH;
});

test("builds runner status args", () => {
  const supervisor = new RunnerSupervisor("/tmp/companyhelm");

  const args = supervisor.buildStatusArgs();

  expect(args.command).toBe(process.execPath);
  expect(args.args[0]).toContain("@companyhelm/runner");
  expect(args.args.slice(1)).toEqual(["--config-path", "/tmp/companyhelm", "status"]);
});

test("builds runner stop args at the root command level", () => {
  const supervisor = new RunnerSupervisor("/tmp/companyhelm");

  const args = supervisor.buildStopArgs();

  expect(args.command).toBe(process.execPath);
  expect(args.args[0]).toContain("@companyhelm/runner");
  expect(args.args.slice(1)).toEqual(["--config-path", "/tmp/companyhelm", "stop"]);
});
