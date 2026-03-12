import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test, vi } from "vitest";

import { DockerStackManager } from "../../src/core/docker/DockerStackManager.js";

test("skips applying seed SQL when the seeded user already exists", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-docker-stack-"));
  fs.writeFileSync(path.join(root, "seed.sql"), "-- seed\n", "utf8");
  const run = vi.fn();
  const capture = vi.fn().mockImplementation(async (_command: string, args: string[]) => {
    const query = args.at(-1);
    if (query === "SELECT to_regclass('public.user_auths') IS NOT NULL") {
      return "t\n";
    }

    return "1\n";
  });
  const manager = new DockerStackManager(
    root,
    {
      run,
      capture
    } as never
  );

  await manager.applySeedSql("admin@local");

  expect(capture).toHaveBeenCalledTimes(2);
  expect(run).not.toHaveBeenCalled();
});

test("applies seed SQL when the seeded user does not exist yet", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-docker-stack-"));
  fs.writeFileSync(path.join(root, "seed.sql"), "-- seed\n", "utf8");
  const run = vi.fn().mockResolvedValue(undefined);
  const capture = vi.fn().mockImplementation(async (_command: string, args: string[]) => {
    const query = args.at(-1);
    if (query === "SELECT to_regclass('public.user_auths') IS NOT NULL") {
      return "t\n";
    }

    return "";
  });
  const manager = new DockerStackManager(
    root,
    {
      run,
      capture
    } as never
  );

  await manager.applySeedSql("admin@local");

  expect(capture).toHaveBeenCalledTimes(2);
  expect(run).toHaveBeenCalledTimes(1);
});

test("waits for the api bootstrap schema before applying seed SQL", async () => {
  vi.useFakeTimers();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-docker-stack-"));
  fs.writeFileSync(path.join(root, "seed.sql"), "-- seed\n", "utf8");
  const run = vi.fn().mockResolvedValue(undefined);
  const capture = vi
    .fn()
    .mockResolvedValueOnce("f\n")
    .mockResolvedValueOnce("f\n")
    .mockImplementation(async (_command: string, args: string[]) => {
      const query = args.at(-1);
      if (query === "SELECT to_regclass('public.user_auths') IS NOT NULL") {
        return "t\n";
      }

      return "";
    });
  const manager = new DockerStackManager(
    root,
    {
      run,
      capture
    } as never
  );

  const applyPromise = manager.applySeedSql("admin@local");

  await vi.runOnlyPendingTimersAsync();
  await vi.runOnlyPendingTimersAsync();
  await applyPromise;

  expect(capture).toHaveBeenCalledTimes(4);
  expect(run).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});

test("down removes volumes when requested", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-docker-stack-"));
  fs.writeFileSync(path.join(root, "docker-compose.yaml"), "services: {}\n", "utf8");
  const run = vi.fn().mockResolvedValue(undefined);
  const manager = new DockerStackManager(
    root,
    {
      run,
      capture: vi.fn()
    } as never
  );

  await manager.down({ removeVolumes: true });

  expect(run).toHaveBeenCalledWith("docker", expect.arrayContaining(["down", "--remove-orphans", "--volumes"]));
});
