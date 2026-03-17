import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import { afterEach, expect, test, vi } from "vitest";

import { createDefaultDependencies } from "../../src/commands/dependencies.js";
import * as setupGithubAppCommand from "../../src/commands/setup-github-app.js";
import * as startupPreferencesCommand from "../../src/commands/startup-preferences.js";
import { DeploymentBootstrapper } from "../../src/core/bootstrap/DeploymentBootstrapper.js";
import { ApiEnvFileWriter } from "../../src/core/config/ApiEnvFileWriter.js";
import { GithubAppConfigStore } from "../../src/core/config/GithubAppConfigStore.js";
import { DockerStackManager } from "../../src/core/docker/DockerStackManager.js";
import { ApiLocalService } from "../../src/core/local/ApiLocalService.js";
import { LocalServiceProcessManager } from "../../src/core/local/LocalServiceProcessManager.js";
import { WebLocalService } from "../../src/core/local/WebLocalService.js";
import { CommandRunner } from "../../src/core/process/CommandRunner.js";
import { TerminalRenderer } from "../../src/core/ui/TerminalRenderer.js";
import YAML from "yaml";

const require = createRequire(import.meta.url);
const originalEnv = { ...process.env };
const originalCwd = process.cwd();
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function mockRunnerNotRunning(): void {
  vi.spyOn(CommandRunner.prototype, "capture").mockRejectedValue(new Error("CompanyHelm runner is not running."));
}

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

  vi.spyOn(startupPreferencesCommand, "ensureAgentWorkspaceMode").mockResolvedValue("dedicated");
  vi.spyOn(GithubAppConfigStore.prototype, "load").mockReturnValue({
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
  mockRunnerNotRunning();
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
  expect(output).toContain("companyhelm-web image: registry.example.com/companyhelm-web:2026.03.12");
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

  vi.spyOn(GithubAppConfigStore.prototype, "load").mockReturnValue({
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

test("up continues without github auth when machine github app config is missing", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-project-"));
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-test-"));
  process.chdir(projectRoot);
  process.env.COMPANYHELM_HOME = runtimeRoot;
  vi.spyOn(startupPreferencesCommand, "ensureAgentWorkspaceMode").mockResolvedValue("dedicated");

  const ensureGithubAppConfig = vi.spyOn(setupGithubAppCommand, "ensureGithubAppConfig").mockResolvedValue(null);
  vi.spyOn(ApiEnvFileWriter.prototype, "write").mockReturnValue(path.join(projectRoot, ".companyhelm", "api", ".env"));
  vi.spyOn(DeploymentBootstrapper.prototype, "writeSeedSql").mockImplementation(() => undefined);
  vi.spyOn(DeploymentBootstrapper.prototype, "writeApiConfig").mockImplementation(() => undefined);
  vi.spyOn(DeploymentBootstrapper.prototype, "writeFrontendConfig").mockImplementation(() => undefined);
  vi.spyOn(DockerStackManager.prototype, "up").mockResolvedValue(undefined);
  vi.spyOn(DockerStackManager.prototype, "applySeedSql").mockResolvedValue(undefined);
  mockRunnerNotRunning();
  vi.spyOn(CommandRunner.prototype, "run").mockResolvedValue(undefined);
  vi.spyOn(TerminalRenderer.prototype, "renderBanner").mockReturnValue("COMPANYHELM");
  vi.spyOn(TerminalRenderer.prototype, "success").mockImplementation((message: string) => message);
  vi.spyOn(TerminalRenderer.prototype, "progress").mockImplementation((message: string) => `... ${message}`);
  vi.spyOn(TerminalRenderer.prototype, "successHighlight").mockImplementation((message: string) => message);
  vi.spyOn(TerminalRenderer.prototype, "clickableUrl").mockImplementation((url: string) => url);

  const dependencies = createDefaultDependencies();
  await expect(dependencies.up()).resolves.toBeUndefined();

  expect(ensureGithubAppConfig).toHaveBeenCalledOnce();
  expect(ApiEnvFileWriter.prototype.write).toHaveBeenCalledWith(null);
});

test("up reuses an existing runner daemon and logs that startup was skipped", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-project-"));
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-test-"));
  process.chdir(projectRoot);
  process.env.COMPANYHELM_HOME = runtimeRoot;

  vi.spyOn(startupPreferencesCommand, "ensureAgentWorkspaceMode").mockResolvedValue("dedicated");
  vi.spyOn(setupGithubAppCommand, "ensureGithubAppConfig").mockResolvedValue({
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
  vi.spyOn(CommandRunner.prototype, "capture").mockResolvedValue("Daemon: running");
  const run = vi.spyOn(CommandRunner.prototype, "run").mockResolvedValue(undefined);
  vi.spyOn(TerminalRenderer.prototype, "renderBanner").mockReturnValue("COMPANYHELM");
  vi.spyOn(TerminalRenderer.prototype, "success").mockImplementation((message: string) => message);
  vi.spyOn(TerminalRenderer.prototype, "progress").mockImplementation((message: string) => `... ${message}`);
  vi.spyOn(TerminalRenderer.prototype, "successHighlight").mockImplementation((message: string) => message);
  vi.spyOn(TerminalRenderer.prototype, "clickableUrl").mockImplementation((url: string) => url);
  const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

  await createDefaultDependencies().up();

  const output = stdoutWrite.mock.calls.map(([chunk]) => String(chunk)).join("");
  expect(run).not.toHaveBeenCalled();
  expect(output).toContain("... Runner already running; skipping startup.");
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

test("reset deletes the machine GitHub App config when requested", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-reset-project-"));
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-reset-runtime-"));
  const configRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-reset-config-"));
  process.chdir(projectRoot);
  process.env.COMPANYHELM_HOME = runtimeRoot;
  process.env.COMPANYHELM_CONFIG_HOME = configRoot;
  fs.writeFileSync(path.join(configRoot, "github-app.yaml"), "app_url: https://github.com/apps/example\n", "utf8");

  vi.spyOn(DockerStackManager.prototype, "down").mockResolvedValue(undefined);

  await createDefaultDependencies().reset({ removeGithubAppConfig: true });

  expect(fs.existsSync(path.join(configRoot, "github-app.yaml"))).toBe(false);
});

test("up starts the api from a local repo when apiRepoPath is selected", async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-up-"));
  const projectRoot = path.join(workspaceRoot, "companyhelm");
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-deps-test-"));
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, "companyhelm-api"), { recursive: true });
  process.chdir(projectRoot);
  process.env.COMPANYHELM_HOME = runtimeRoot;

  vi.spyOn(startupPreferencesCommand, "ensureAgentWorkspaceMode").mockResolvedValue("dedicated");
  vi.spyOn(setupGithubAppCommand, "ensureGithubAppConfig").mockResolvedValue({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });
  vi.spyOn(ApiEnvFileWriter.prototype, "write").mockReturnValue(path.join(projectRoot, ".companyhelm", "api", ".env"));
  vi.spyOn(DeploymentBootstrapper.prototype, "writeSeedSql").mockImplementation(() => undefined);
  vi.spyOn(DeploymentBootstrapper.prototype, "writeApiConfig").mockImplementation(() => undefined);
  vi.spyOn(DeploymentBootstrapper.prototype, "writeFrontendConfig").mockImplementation(() => undefined);
  const dockerUp = vi.spyOn(DockerStackManager.prototype, "up").mockResolvedValue(undefined);
  vi.spyOn(DockerStackManager.prototype, "applySeedSql").mockResolvedValue(undefined);
  mockRunnerNotRunning();
  vi.spyOn(CommandRunner.prototype, "run").mockResolvedValue(undefined);
  vi.spyOn(ApiLocalService.prototype, "start").mockResolvedValue({
    source: "local",
    repoPath: path.join(workspaceRoot, "companyhelm-api"),
    logPath: path.join(runtimeRoot, "services", "api.log"),
    pid: 1234
  });
  const startWeb = vi.spyOn(WebLocalService.prototype, "start").mockResolvedValue({
    source: "local",
    repoPath: path.join(workspaceRoot, "companyhelm-web"),
    logPath: path.join(runtimeRoot, "services", "frontend.log"),
    pid: 5678
  });
  vi.spyOn(TerminalRenderer.prototype, "renderBanner").mockReturnValue("COMPANYHELM");
  vi.spyOn(TerminalRenderer.prototype, "success").mockImplementation((message: string) => message);
  vi.spyOn(TerminalRenderer.prototype, "progress").mockImplementation((message: string) => `... ${message}`);
  vi.spyOn(TerminalRenderer.prototype, "successHighlight").mockImplementation((message: string) => message);
  vi.spyOn(TerminalRenderer.prototype, "clickableUrl").mockImplementation((url: string) => url);

  await createDefaultDependencies().up({ apiRepoPath: true });

  expect(dockerUp).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    includeApi: false,
    includeFrontend: true,
    exposePostgresPort: true
  }));
  expect(ApiLocalService.prototype.start).toHaveBeenCalledWith(expect.objectContaining({
    repoPath: expect.stringMatching(/companyhelm-api$/)
  }));
  expect(startWeb).not.toHaveBeenCalled();
});

test("logs reads the local api log file when api is running from a local repo", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-logs-"));
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-runtime-"));
  const logPath = path.join(runtimeRoot, "services", "api.log");
  process.chdir(projectRoot);
  process.env.COMPANYHELM_HOME = runtimeRoot;
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, "api-local-log\n", "utf8");
  fs.writeFileSync(path.join(runtimeRoot, "state.yaml"), YAML.stringify({
    version: 1,
    company: {
      id: "company-id",
      name: "Local CompanyHelm"
    },
    auth: {
      username: "admin@local",
      password: "secret",
      jwtPrivateKeyPem: "private",
      jwtPublicKeyPem: "public"
    },
    runner: {
      name: "local-runner",
      secret: "runner-secret"
    },
    ports: {
      apiHttp: 4000,
      ui: 4173,
      runnerGrpc: 50051,
      agentCliGrpc: 50052
    },
    services: {
      api: {
        source: "local",
        repoPath: "/workspace/companyhelm-api",
        logPath,
        pid: 1234
      },
      frontend: {
        source: "docker"
      }
    }
  }), "utf8");

  const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const dockerLogs = vi.spyOn(DockerStackManager.prototype, "logs").mockResolvedValue(undefined);

  await createDefaultDependencies().logs("api");

  expect(stdoutWrite).toHaveBeenCalledWith("api-local-log\n");
  expect(dockerLogs).not.toHaveBeenCalled();
});

test("down stops local services recorded in runtime state before tearing down docker", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-down-"));
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-runtime-"));
  process.chdir(projectRoot);
  process.env.COMPANYHELM_HOME = runtimeRoot;
  fs.writeFileSync(path.join(runtimeRoot, "state.yaml"), YAML.stringify({
    version: 1,
    company: {
      id: "company-id",
      name: "Local CompanyHelm"
    },
    auth: {
      username: "admin@local",
      password: "secret",
      jwtPrivateKeyPem: "private",
      jwtPublicKeyPem: "public"
    },
    runner: {
      name: "local-runner",
      secret: "runner-secret"
    },
    ports: {
      apiHttp: 4000,
      ui: 4173,
      runnerGrpc: 50051,
      agentCliGrpc: 50052
    },
    services: {
      api: {
        source: "local",
        repoPath: "/workspace/companyhelm-api",
        logPath: path.join(runtimeRoot, "services", "api.log"),
        pid: 1234
      },
      frontend: {
        source: "local",
        repoPath: "/workspace/companyhelm-web",
        logPath: path.join(runtimeRoot, "services", "frontend.log"),
        pid: 5678
      }
    }
  }), "utf8");

  const stopLocalService = vi.spyOn(LocalServiceProcessManager.prototype, "stop").mockResolvedValue(undefined);
  const dockerDown = vi.spyOn(DockerStackManager.prototype, "down").mockResolvedValue(undefined);
  vi.spyOn(CommandRunner.prototype, "run").mockResolvedValue(undefined);

  await createDefaultDependencies().down();

  expect(stopLocalService).toHaveBeenCalledTimes(2);
  expect(dockerDown).toHaveBeenCalledOnce();
});

test("down still stops the runner when runtime state is missing", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-down-"));
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-runtime-"));
  process.chdir(projectRoot);
  process.env.COMPANYHELM_HOME = runtimeRoot;

  const run = vi.spyOn(CommandRunner.prototype, "run").mockResolvedValue(undefined);
  const dockerDown = vi.spyOn(DockerStackManager.prototype, "down").mockResolvedValue(undefined);

  await createDefaultDependencies().down();

  expect(run).toHaveBeenCalledTimes(1);
  expect(run.mock.calls[0]?.[1].slice(-1)).toEqual(["stop"]);
  expect(dockerDown).not.toHaveBeenCalled();
});
