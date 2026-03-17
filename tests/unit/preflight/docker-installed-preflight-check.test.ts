import { expect, test, vi } from "vitest";

import { DockerInstalledPreflightCheck } from "../../../src/preflight/DockerInstalledPreflightCheck.js";

test("passes when docker reports its version", async () => {
  const commandRunner = {
    capture: vi.fn().mockResolvedValue("Docker version 28.0.0")
  };

  await expect(new DockerInstalledPreflightCheck(commandRunner as never).run()).resolves.toBeUndefined();
  expect(commandRunner.capture).toHaveBeenCalledWith("docker", ["--version"]);
});

test("fails with a clear message when docker is unavailable", async () => {
  const commandRunner = {
    capture: vi.fn().mockRejectedValue(new Error("spawn docker ENOENT"))
  };

  await expect(new DockerInstalledPreflightCheck(commandRunner as never).run()).rejects.toThrow(
    "Docker is required for `companyhelm up`, but the `docker` command is unavailable. Install Docker and make sure it is on your PATH."
  );
});
