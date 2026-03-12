import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import { afterEach, expect, test, vi } from "vitest";

import { createDefaultDependencies } from "../../src/commands/dependencies.js";
import { DeploymentBootstrapper } from "../../src/core/bootstrap/DeploymentBootstrapper.js";
import { DockerStackManager } from "../../src/core/docker/DockerStackManager.js";
import { CommandRunner } from "../../src/core/process/CommandRunner.js";
import { TerminalRenderer } from "../../src/core/ui/TerminalRenderer.js";

const require = createRequire(import.meta.url);
const originalEnv = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

test("up prints resolved package versions and exact image references", async () => {
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-test-"));
  process.env.COMPANYHELM_HOME = runtimeRoot;
  process.env.COMPANYHELM_API_IMAGE = "registry.example.com/companyhelm-api:2026.03.12";
  process.env.COMPANYHELM_WEB_IMAGE = "registry.example.com/companyhelm-web:2026.03.12";
  process.env.COMPANYHELM_POSTGRES_IMAGE = "postgres:17.2-alpine";

  vi.spyOn(DeploymentBootstrapper.prototype, "writeSeedSql").mockImplementation(() => undefined);
  vi.spyOn(DeploymentBootstrapper.prototype, "writeApiConfig").mockImplementation(() => undefined);
  vi.spyOn(DeploymentBootstrapper.prototype, "writeFrontendConfig").mockImplementation(() => undefined);
  vi.spyOn(DockerStackManager.prototype, "up").mockResolvedValue(undefined);
  vi.spyOn(DockerStackManager.prototype, "applySeedSql").mockResolvedValue(undefined);
  vi.spyOn(CommandRunner.prototype, "run").mockResolvedValue(undefined);
  vi.spyOn(TerminalRenderer.prototype, "renderBanner").mockReturnValue("COMPANYHELM");
  vi.spyOn(TerminalRenderer.prototype, "success").mockImplementation((message: string) => message);
  vi.spyOn(TerminalRenderer.prototype, "progress").mockImplementation((message: string) => `... ${message}`);
  vi.spyOn(TerminalRenderer.prototype, "successHighlight").mockImplementation((message: string) => message);
  vi.spyOn(TerminalRenderer.prototype, "clickableUrl").mockImplementation((url: string) => url);

  const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const dependencies = createDefaultDependencies();

  await dependencies.up();

  const output = stdoutWrite.mock.calls.map(([chunk]) => String(chunk)).join("");
  const cliPackage = JSON.parse(fs.readFileSync("package.json", "utf8")) as { name: string; version: string };
  const runnerPackage = JSON.parse(
    fs.readFileSync(require.resolve("@companyhelm/runner/package.json"), "utf8")
  ) as { name: string; version: string };

  expect(output).toContain(`CompanyHelm CLI: ${cliPackage.name}@${cliPackage.version}`);
  expect(output).toContain(`Runner package: ${runnerPackage.name}@${runnerPackage.version}`);
  expect(output).toContain("API image: registry.example.com/companyhelm-api:2026.03.12");
  expect(output).toContain("Frontend image: registry.example.com/companyhelm-web:2026.03.12");
  expect(output).toContain("Postgres image: postgres:17.2-alpine");
  expect(output).toContain("CompanyHelm started successfully.");
  expect(output).toContain("UI URL\nhttp://127.0.0.1:4173");
  expect(output).toContain("Login credentials\nusername: admin@local\npassword: ");
  expect(output.indexOf("CompanyHelm started successfully.")).toBeLessThan(output.indexOf("UI URL\nhttp://127.0.0.1:4173"));
  expect(output.indexOf("UI URL\nhttp://127.0.0.1:4173")).toBeLessThan(output.indexOf("Login credentials\nusername: admin@local\npassword: "));
});

test("status includes resolved versions", async () => {
  process.env.COMPANYHELM_API_IMAGE = "registry.example.com/companyhelm-api:2026.03.12";
  process.env.COMPANYHELM_WEB_IMAGE = "registry.example.com/companyhelm-web:2026.03.12";
  process.env.COMPANYHELM_POSTGRES_IMAGE = "postgres:17.2-alpine";

  vi.spyOn(DockerStackManager.prototype, "runningServices").mockResolvedValue("postgres\napi\nfrontend");
  vi.spyOn(CommandRunner.prototype, "capture").mockResolvedValue("Daemon: running");

  const dependencies = createDefaultDependencies();
  const status = await dependencies.status();
  const cliPackage = JSON.parse(fs.readFileSync("package.json", "utf8")) as { name: string; version: string };
  const runnerPackage = JSON.parse(
    fs.readFileSync(require.resolve("@companyhelm/runner/package.json"), "utf8")
  ) as { name: string; version: string };

  expect(status.versions).toEqual({
    cliPackage: `${cliPackage.name}@${cliPackage.version}`,
    runnerPackage: `${runnerPackage.name}@${runnerPackage.version}`,
    images: {
      api: "registry.example.com/companyhelm-api:2026.03.12",
      frontend: "registry.example.com/companyhelm-web:2026.03.12",
      postgres: "postgres:17.2-alpine"
    }
  });
});
