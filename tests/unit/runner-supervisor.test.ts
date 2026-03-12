import { expect, test } from "vitest";

import { RunnerSupervisor } from "../../src/core/runner/RunnerSupervisor.js";

test("builds runner launch args with the generated secret", () => {
  const supervisor = new RunnerSupervisor("/tmp/companyhelm");

  const args = supervisor.buildStartArgs({
    grpcTarget: "127.0.0.1:5051",
    secret: "runner-secret"
  });

  expect(args.command).toBe(process.execPath);
  expect(args.args[0]).toContain("@companyhelm/runner");
  expect(args.args).toContain("runner-secret");
  expect(args.args).toContain("127.0.0.1:5051");
});

test("prefers an explicit runner cli override", () => {
  process.env.COMPANYHELM_RUNNER_CLI_PATH = "/tmp/custom-runner.js";

  const supervisor = new RunnerSupervisor("/tmp/companyhelm");
  const args = supervisor.buildStartArgs({
    grpcTarget: "127.0.0.1:5051",
    secret: "runner-secret"
  });

  expect(args.command).toBe(process.execPath);
  expect(args.args[0]).toBe("/tmp/custom-runner.js");

  delete process.env.COMPANYHELM_RUNNER_CLI_PATH;
});
