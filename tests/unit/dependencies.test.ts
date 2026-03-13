import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import { afterEach, expect, test, vi } from "vitest";

import { createDefaultDependencies } from "../../src/commands/dependencies.js";
import { DeploymentBootstrapper } from "../../src/core/bootstrap/DeploymentBootstrapper.js";
import { ApiEnvFileWriter } from "../../src/core/config/ApiEnvFileWriter.js";
import { GithubAppConfigStore } from "../../src/core/config/GithubAppConfigStore.js";
import { DockerStackManager } from "../../src/core/docker/DockerStackManager.js";
import { CommandRunner } from "../../src/core/process/CommandRunner.js";
import { TerminalRenderer } from "../../src/core/ui/TerminalRenderer.js";

const require = createRequire(import.meta.url);
const originalEnv = { ...process.env };
const originalCwd = process.cwd();
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
  process.chdir(originalCwd);
});

test("up prints resolved package versions and exact image references", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-project-"));
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-test-"));
  process.chdir(projectRoot);
  process.env.COMPANYHELM_HOME = runtimeRoot;
  process.env.COMPANYHELM_API_IMAGE = "registry.example.com/companyhelm-api:2026.03.12";
  process.env.COMPANYHELM_WEB_IMAGE = "registry.example.com/companyhelm-web:2026.03.12";
  process.env.COMPANYHELM_POSTGRES_IMAGE = "postgres:17.2-alpine";

  vi.spyOn(GithubAppConfigStore.prototype, "loadOrThrow").mockReturnValue({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });
  vi.spyOn(ApiEnvFileWriter.prototype, "write").mockReturnValue(path.join(projectRoot, ".companyhelm", "api", ".env"));
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
  const cliPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
    name: string;
    version: string;
  };
  const runnerPackage = JSON.parse(
    fs.readFileSync(require.resolve("@companyhelm/runner/package.json"), "utf8")
  ) as { name: string; version: string };

  expect(output).toContain(`CompanyHelm CLI: ${cliPackage.name}@${cliPackage.version}`);
  expect(output).toContain(`Runner package: ${runnerPackage.name}@${runnerPackage.version}`);
  expect(output).toContain("API image: registry.example.com/companyhelm-api:2026.03.12");
  expect(output).toContain("Frontend image: registry.example.com/companyhelm-web:2026.03.12");
  expect(output).toContain("Postgres image: postgres:17.2-alpine");
  expect(output).toContain("... Waiting for database migrations...");
  expect(output).toContain("CompanyHelm started successfully.");
  expect(output).toContain("UI URL\nhttp://127.0.0.1:4173");
  expect(output).toContain("Login credentials\nusername: admin@local\npassword: ");
  expect(output.indexOf("CompanyHelm started successfully.")).toBeLessThan(output.indexOf("UI URL\nhttp://127.0.0.1:4173"));
  expect(output.indexOf("UI URL\nhttp://127.0.0.1:4173")).toBeLessThan(output.indexOf("Login credentials\nusername: admin@local\npassword: "));
});

test("status includes resolved versions", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-project-"));
  process.chdir(projectRoot);
  process.env.COMPANYHELM_API_IMAGE = "registry.example.com/companyhelm-api:2026.03.12";
  process.env.COMPANYHELM_WEB_IMAGE = "registry.example.com/companyhelm-web:2026.03.12";
  process.env.COMPANYHELM_POSTGRES_IMAGE = "postgres:17.2-alpine";

  vi.spyOn(GithubAppConfigStore.prototype, "loadOrThrow").mockReturnValue({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });
  vi.spyOn(DockerStackManager.prototype, "runningServices").mockResolvedValue("postgres\napi\nfrontend");
  vi.spyOn(CommandRunner.prototype, "capture").mockResolvedValue("Daemon: running");

  const dependencies = createDefaultDependencies();
  const status = await dependencies.status();
  const cliPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
    name: string;
    version: string;
  };
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

test("up fails with a setup hint when machine github app config is missing", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-project-"));
  process.chdir(projectRoot);
  vi.spyOn(GithubAppConfigStore.prototype, "loadOrThrow").mockImplementation(() => {
    throw new Error("GitHub App config is not set up. Run `companyhelm setup-github-app`.");
  });

  await expect(createDefaultDependencies().up()).rejects.toThrow(/setup-github-app/);
});

test("reset deletes the generated project api env file", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-reset-project-"));
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-reset-runtime-"));
  process.chdir(projectRoot);
  process.env.COMPANYHELM_HOME = runtimeRoot;
  fs.mkdirSync(path.join(projectRoot, ".companyhelm", "api"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, ".companyhelm", "api", ".env"), "GITHUB_APP_URL=value\n", "utf8");

  vi.spyOn(DockerStackManager.prototype, "down").mockResolvedValue(undefined);

  await createDefaultDependencies().reset();

  expect(fs.existsSync(path.join(projectRoot, ".companyhelm", "api", ".env"))).toBe(false);
});
