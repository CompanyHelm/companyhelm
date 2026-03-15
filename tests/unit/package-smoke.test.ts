import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync
} from "node:fs";
import { expect, test } from "vitest";

test("package manifest exists", () => {
  expect(existsSync("package.json")).toBe(true);
});

test("built cli entrypoint includes a node shebang", () => {
  const cliFile = readFileSync("dist/cli.js", "utf8");
  expect(cliFile.startsWith("#!/usr/bin/env node\n")).toBe(true);
});

test("built cli entrypoint runs through a symlinked bin path", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "companyhelm-bin-"));
  const symlinkPath = path.join(fixtureDir, "companyhelm");

  try {
    symlinkSync(path.resolve("dist/cli.js"), symlinkPath);
    const result = spawnSync(process.execPath, [symlinkPath, "--help"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: companyhelm");
  } finally {
    rmSync(fixtureDir, { force: true, recursive: true });
  }
});
