import { expect, test } from "vitest";

import { RunnerSupervisor } from "../../src/core/runner/RunnerSupervisor.js";

test("builds runner launch args with the generated secret", () => {
  const supervisor = new RunnerSupervisor("/tmp/companyhelm");

  const args = supervisor.buildStartArgs({
    serverUrl: "127.0.0.1:50051",
    agentApiUrl: "http://127.0.0.1:4000/agent/v1",
    logPath: "/tmp/companyhelm/daemon.log",
    secret: "runner-secret",
    logLevel: "debug"
  });

  expect(args.command).toBe(process.execPath);
  expect(args.args[0]).toContain("runner-bootstrap.js");
  expect(args.args[1]).toBe("--config-path");
  expect(args.args).toContain("--daemon");
  expect(args.args).toContain("start");
  expect(args.args).toContain("--server-url");
  expect(args.args).toContain("127.0.0.1:50051");
  expect(args.args).toContain("--agent-api-url");
  expect(args.args).toContain("http://127.0.0.1:4000/agent/v1");
  expect(args.args).toContain("--log-path");
  expect(args.args).toContain("/tmp/companyhelm/daemon.log");
  expect(args.args).toContain("runner-secret");
  expect(args.args).toContain("--log-level");
  expect(args.args).toContain("DEBUG");
  expect(args.args).not.toContain("--use-host-docker-runtime");
  expect(args.args).not.toContain("--host-docker-path");
  expect(args.env).toBeUndefined();
});

test("adds host docker runtime args when enabled", () => {
  const originalDockerHost = process.env.DOCKER_HOST;
  delete process.env.DOCKER_HOST;

  const supervisor = new RunnerSupervisor("/tmp/companyhelm");
  const args = supervisor.buildStartArgs({
    serverUrl: "127.0.0.1:50051",
    agentApiUrl: "http://127.0.0.1:4000/agent/v1",
    logPath: "/tmp/companyhelm/daemon.log",
    secret: "runner-secret",
    useHostDockerRuntime: true,
  });

  expect(args.args).toContain("--use-host-docker-runtime");
  expect(args.args).toContain("--host-docker-path");
  expect(args.args).toContain("unix:///var/run/docker.sock");

  if (originalDockerHost) {
    process.env.DOCKER_HOST = originalDockerHost;
  } else {
    delete process.env.DOCKER_HOST;
  }
});

test("uses DOCKER_HOST for the runner host docker path when host runtime is enabled", () => {
  const originalDockerHost = process.env.DOCKER_HOST;
  process.env.DOCKER_HOST = "tcp://localhost:2375";

  const supervisor = new RunnerSupervisor("/tmp/companyhelm");
  const args = supervisor.buildStartArgs({
    serverUrl: "127.0.0.1:50051",
    agentApiUrl: "http://127.0.0.1:4000/agent/v1",
    logPath: "/tmp/companyhelm/daemon.log",
    secret: "runner-secret",
    useHostDockerRuntime: true,
  });

  const dockerPathIndex = args.args.indexOf("--host-docker-path");
  expect(dockerPathIndex).toBeGreaterThan(-1);
  expect(args.args[dockerPathIndex + 1]).toBe("tcp://localhost:2375");

  if (originalDockerHost) {
    process.env.DOCKER_HOST = originalDockerHost;
  } else {
    delete process.env.DOCKER_HOST;
  }
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
    agentApiUrl: "http://127.0.0.1:4000/agent/v1",
    logPath: "/tmp/companyhelm/daemon.log",
    secret: "runner-secret"
  });

  expect(args.command).toBe(process.execPath);
  expect(args.args[0]).toContain("runner-bootstrap.js");
  expect(args.args[1]).toBe("/tmp/custom-runner.js");

  delete process.env.COMPANYHELM_RUNNER_CLI_PATH;
});

test("passes current working directory workspace mode through the environment", () => {
  const supervisor = new RunnerSupervisor("/tmp/companyhelm");

  const args = supervisor.buildStartArgs({
    serverUrl: "127.0.0.1:50051",
    agentApiUrl: "http://127.0.0.1:4000/agent/v1",
    logPath: "/tmp/companyhelm/daemon.log",
    secret: "runner-secret",
    workspaceMode: "current-working-directory",
    projectRoot: "/workspace/companyhelm"
  });

  expect(args.env).toEqual({
    COMPANYHELM_RUNNER_WORKSPACE_MODE: "current-working-directory",
    COMPANYHELM_RUNNER_PROJECT_ROOT: "/workspace/companyhelm"
  });
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
