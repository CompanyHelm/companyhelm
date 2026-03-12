import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test, vi } from "vitest";

import { DockerStackManager } from "../../src/core/docker/DockerStackManager.js";

test("skips applying seed SQL when the seeded user already exists", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-docker-stack-"));
  fs.writeFileSync(path.join(root, "seed.sql"), "-- seed\n", "utf8");
  const run = vi.fn();
  const capture = vi.fn().mockResolvedValue("1\n");
  const manager = new DockerStackManager(
    root,
    {
      run,
      capture
    } as never
  );

  await manager.applySeedSql("admin@local");

  expect(capture).toHaveBeenCalledTimes(1);
  expect(run).not.toHaveBeenCalled();
});

test("applies seed SQL when the seeded user does not exist yet", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-docker-stack-"));
  fs.writeFileSync(path.join(root, "seed.sql"), "-- seed\n", "utf8");
  const run = vi.fn().mockResolvedValue(undefined);
  const capture = vi.fn().mockResolvedValue("");
  const manager = new DockerStackManager(
    root,
    {
      run,
      capture
    } as never
  );

  await manager.applySeedSql("admin@local");

  expect(capture).toHaveBeenCalledTimes(1);
  expect(run).toHaveBeenCalledTimes(1);
});
