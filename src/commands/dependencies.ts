import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { DeploymentBootstrapper } from "../core/bootstrap/DeploymentBootstrapper.js";
import { ApiEnvFileWriter } from "../core/config/ApiEnvFileWriter.js";
import { GithubAppConfigStore } from "../core/config/GithubAppConfigStore.js";
import { DockerStackManager } from "../core/docker/DockerStackManager.js";
import { ApiLocalService } from "../core/local/ApiLocalService.js";
import { LocalRepoSourceResolver } from "../core/local/LocalRepoSourceResolver.js";
import { LocalServiceProcessManager } from "../core/local/LocalServiceProcessManager.js";
import { WebLocalService } from "../core/local/WebLocalService.js";
import { LogsService } from "../core/logs/LogsService.js";
import { CommandRunner } from "../core/process/CommandRunner.js";
import { ProjectPaths } from "../core/runtime/ProjectPaths.js";
import { RunnerSupervisor } from "../core/runner/RunnerSupervisor.js";
import { createPasswordHash } from "../core/runtime/Secrets.js";
import { RuntimePaths } from "../core/runtime/RuntimePaths.js";
import type { RuntimeState } from "../core/runtime/RuntimeState.js";
import { RuntimeStateStore } from "../core/runtime/RuntimeStateStore.js";
import { VersionCatalog, type RuntimeVersions } from "../core/runtime/VersionCatalog.js";
import { StatusService, type StatusSnapshot } from "../core/status/StatusService.js";
import { TerminalRenderer } from "../core/ui/TerminalRenderer.js";
import { ensureGithubAppConfig } from "./setup-github-app.js";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LocalRepoOptionValue = string | true | undefined;

export interface UpOptions {
  logLevel?: LogLevel;
  useHostDockerRuntime?: boolean;
  apiRepoPath?: LocalRepoOptionValue;
  webRepoPath?: LocalRepoOptionValue;
}

export interface ResetOptions {
  removeGithubAppConfig?: boolean;
}

export interface StatusReport {
  services: StatusSnapshot;
  apiUrl?: string;
  uiUrl?: string;
  username?: string;
  versions?: RuntimeVersions;
}

export interface CommandDependencies {
  up(options?: UpOptions): Promise<void>;
  down(): Promise<void>;
  status(): Promise<StatusReport>;
  logs(service: string): Promise<void>;
  reset(options?: ResetOptions): Promise<void>;
}

function runtimeRoot(): string {
  return process.env.COMPANYHELM_HOME || path.join(os.homedir(), ".companyhelm");
}

export function createDefaultDependencies(): CommandDependencies {
  const root = runtimeRoot();
  const stateStore = new RuntimeStateStore(root);
  const runtimePaths = new RuntimePaths(root);
  const commandRunner = new CommandRunner();
  const renderer = new TerminalRenderer(process.stdout.isTTY);
  const dockerStackManager = new DockerStackManager(root, commandRunner);
  const runnerSupervisor = new RunnerSupervisor(runtimePaths.runnerConfigPath());
  const bootstrapper = new DeploymentBootstrapper();
  const githubAppConfigStore = new GithubAppConfigStore();
  const apiEnvFileWriter = new ApiEnvFileWriter(process.cwd());
  const projectPaths = new ProjectPaths(process.cwd());
  const localRepoSourceResolver = new LocalRepoSourceResolver(process.cwd());
  const localServiceProcessManager = new LocalServiceProcessManager();
  const apiLocalService = new ApiLocalService(localServiceProcessManager, commandRunner);
  const webLocalService = new WebLocalService(localServiceProcessManager, commandRunner);
  const versionCatalog = new VersionCatalog();
  const statusService = new StatusService(
    () => dockerStackManager.runningServices(),
    {
      api: () => {
        const state = stateStore.load();
        return state?.services.api.source === "local"
          ? localServiceProcessManager.isRunning(state.services.api)
          : undefined;
      },
      frontend: () => {
        const state = stateStore.load();
        return state?.services.frontend.source === "local"
          ? localServiceProcessManager.isRunning(state.services.frontend)
          : undefined;
      },
      runner: async () => {
        try {
          const statusCommand = runnerSupervisor.buildStatusArgs();
          const output = await commandRunner.capture(statusCommand.command, statusCommand.args);
          return output.includes("Daemon: running");
        } catch {
          return false;
        }
      }
    }
  );
  const logsService = new LogsService(async (service) => {
    if (service === "runner") {
      if (fs.existsSync(runtimePaths.runnerLogPath())) {
        process.stdout.write(fs.readFileSync(runtimePaths.runnerLogPath(), "utf8"));
      }
      return;
    }

    const state = stateStore.load();
    if (service === "api" && state?.services.api.source === "local") {
      localServiceProcessManager.printLogs(state.services.api);
      return;
    }

    if (service === "frontend" && state?.services.frontend.source === "local") {
      localServiceProcessManager.printLogs(state.services.frontend);
      return;
    }

    await dockerStackManager.logs(service);
  });

  return {
    async up(options = {}) {
      const logLevel = options.logLevel ?? "info";
      const useHostDockerRuntime = options.useHostDockerRuntime ?? false;
      const githubAppConfig = await ensureGithubAppConfig(githubAppConfigStore, process.stdin, process.stdout);
      const state = stateStore.initialize();
      const desiredSources = localRepoSourceResolver.resolve(options);
      const versions = versionCatalog.resolve();
      const passwordRecord = createPasswordHash(state.auth.password);
      const startedLocalServices: Array<"api" | "frontend"> = [];
      let runnerStarted = false;
      fs.mkdirSync(root, { recursive: true });
      fs.mkdirSync(runtimePaths.serviceRuntimePath(), { recursive: true });
      apiEnvFileWriter.write(githubAppConfig);
      bootstrapper.writeSeedSql(root, state, passwordRecord.passwordHash, passwordRecord.passwordSalt);
      bootstrapper.writeApiConfig(root, state, logLevel, {
        databaseHost: desiredSources.api.source === "local" ? "127.0.0.1" : "postgres"
      });
      bootstrapper.writeFrontendConfig(root, state);
      process.stdout.write(`${renderer.renderBanner()}\n`);
      await stopLocalServicesFromState(stateStore.load(), localServiceProcessManager);

      try {
        await dockerStackManager.up(state, {
          frontendLogLevel: logLevel,
          includeApi: desiredSources.api.source === "docker",
          includeFrontend: desiredSources.frontend.source === "docker",
          exposePostgresPort: desiredSources.api.source === "local"
        });

        const apiUrl = `http://127.0.0.1:${state.ports.apiHttp}/graphql`;
        const uiUrl = `http://127.0.0.1:${state.ports.ui}`;

        if (desiredSources.api.source === "local") {
          process.stdout.write(`${renderer.progress(`Starting companyhelm-api from ${desiredSources.api.repoPath}...`)}\n`);
          state.services.api = await apiLocalService.start({
            repoPath: desiredSources.api.repoPath,
            configPath: runtimePaths.apiConfigPath(),
            graphqlUrl: apiUrl,
            logPath: runtimePaths.serviceLogPath("api"),
            githubAppConfig,
            state,
            logLevel
          });
          startedLocalServices.push("api");
        } else {
          state.services.api = { source: "docker" };
        }

        process.stdout.write(`${renderer.progress("Initializing the database...")}\n`);
        process.stdout.write(`${renderer.progress("Waiting for database migrations...")}\n`);
        await dockerStackManager.applySeedSql(state.auth.username);

        const configureSdkCommand = runnerSupervisor.buildUseHostAuthArgs();
        process.stdout.write(`${renderer.progress("Configuring runner authentication...")}\n`);
        await commandRunner.run(configureSdkCommand.command, configureSdkCommand.args);
        const startCommand = runnerSupervisor.buildStartArgs({
          serverUrl: `127.0.0.1:${state.ports.runnerGrpc}`,
          agentApiUrl: `127.0.0.1:${state.ports.agentCliGrpc}`,
          logPath: runtimePaths.runnerLogPath(),
          secret: state.runner.secret,
          logLevel,
          useHostDockerRuntime
        });
        process.stdout.write(`${renderer.progress("Starting the runner...")}\n`);
        await commandRunner.run(startCommand.command, startCommand.args);
        runnerStarted = true;

        if (desiredSources.frontend.source === "local") {
          process.stdout.write(`${renderer.progress(`Starting companyhelm-web from ${desiredSources.frontend.repoPath}...`)}\n`);
          state.services.frontend = await webLocalService.start({
            repoPath: desiredSources.frontend.repoPath,
            configPath: runtimePaths.frontendConfigPath(),
            url: uiUrl,
            uiPort: state.ports.ui,
            logPath: runtimePaths.serviceLogPath("frontend"),
            logLevel
          });
          startedLocalServices.push("frontend");
        } else {
          state.services.frontend = { source: "docker" };
        }

        stateStore.persist(state);
        process.stdout.write(`${renderer.success(`API ready: ${apiUrl}`)}\n`);
        process.stdout.write(`CompanyHelm CLI: ${versions.cliPackage}\n`);
        process.stdout.write(`Runner package: ${versions.runnerPackage}\n`);
        process.stdout.write(
          desiredSources.api.source === "local"
            ? `API repo: ${desiredSources.api.repoPath}\n`
            : `API image: ${versions.images.api}\n`
        );
        process.stdout.write(
          desiredSources.frontend.source === "local"
            ? `companyhelm-web repo: ${desiredSources.frontend.repoPath}\n`
            : `companyhelm-web image: ${versions.images.frontend}\n`
        );
        process.stdout.write(`Postgres image: ${versions.images.postgres}\n`);
        process.stdout.write(`\n${renderer.success("CompanyHelm started successfully.")}\n`);
        process.stdout.write(`${renderer.successHighlight("UI URL")}\n`);
        process.stdout.write(`${renderer.clickableUrl(uiUrl)}\n`);
        process.stdout.write(`${renderer.successHighlight("Login credentials")}\n`);
        process.stdout.write(`username: ${state.auth.username}\n`);
        process.stdout.write(`password: ${state.auth.password}\n`);
      } catch (error) {
        if (runnerStarted) {
          const stopCommand = runnerSupervisor.buildStopArgs();
          try {
            await commandRunner.run(stopCommand.command, stopCommand.args);
          } catch {
            // Ignore runner stop failures during cleanup.
          }
        }

        for (const service of startedLocalServices.reverse()) {
          const runtime = service === "api" ? state.services.api : state.services.frontend;
          if (runtime.source === "local") {
            await localServiceProcessManager.stop(runtime);
          }
        }
        await dockerStackManager.down();
        throw error;
      }
    },
    async down() {
      const state = stateStore.load();
      if (!state) {
        return;
      }

      const stopCommand = runnerSupervisor.buildStopArgs();
      try {
        await commandRunner.run(stopCommand.command, stopCommand.args);
      } catch {
        // Ignore runner stop failures during teardown so container cleanup still happens.
      }

      await stopLocalServicesFromState(state, localServiceProcessManager);
      await dockerStackManager.down();
    },
    async status() {
      const services = await statusService.read();
      const state = stateStore.load();
      return {
        services,
        apiUrl: state ? `http://127.0.0.1:${state.ports.apiHttp}/graphql` : undefined,
        uiUrl: state ? `http://127.0.0.1:${state.ports.ui}` : undefined,
        username: state?.auth.username,
        versions: versionCatalog.resolve()
      };
    },
    logs(service: string) {
      return logsService.stream(service);
    },
    async reset(options = {}) {
      const state = stateStore.load();
      if (state) {
        const stopCommand = runnerSupervisor.buildStopArgs();
        try {
          await commandRunner.run(stopCommand.command, stopCommand.args);
        } catch {
          // Ignore runner stop failures during teardown so docker cleanup still runs.
        }

        await stopLocalServicesFromState(state, localServiceProcessManager);
      }

      await dockerStackManager.down({ removeVolumes: true });
      fs.rmSync(projectPaths.apiEnvPath(), { force: true });
      fs.rmSync(root, { recursive: true, force: true });
      if (options.removeGithubAppConfig) {
        githubAppConfigStore.delete();
      }
    }
  };
}

async function stopLocalServicesFromState(
  state: RuntimeState | null,
  processManager: LocalServiceProcessManager
): Promise<void> {
  if (!state) {
    return;
  }

  if (state.services.api.source === "local") {
    await processManager.stop(state.services.api);
  }

  if (state.services.frontend.source === "local") {
    await processManager.stop(state.services.frontend);
  }
}
