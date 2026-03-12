import { expect, test } from "vitest";

import { RunnerSupervisor } from "../../src/core/runner/RunnerSupervisor.js";

test("builds runner launch args with the generated secret", () => {
  const supervisor = new RunnerSupervisor("/tmp/companyhelm");

  const args = supervisor.buildStartArgs({
    grpcTarget: "127.0.0.1:5051",
    secret: "runner-secret"
  });

  expect(args.command).toBe("companyhelm-runner");
  expect(args.args).toContain("runner-secret");
  expect(args.args).toContain("127.0.0.1:5051");
});
