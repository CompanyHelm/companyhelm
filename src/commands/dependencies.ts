import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { DeploymentBootstrapper } from "../core/bootstrap/DeploymentBootstrapper.js";
import { DockerStackManager } from "../core/docker/DockerStackManager.js";
import { LogsService } from "../core/logs/LogsService.js";
import { CommandRunner } from "../core/process/CommandRunner.js";
import { RunnerSupervisor } from "../core/runner/RunnerSupervisor.js";
import { createPasswordHash } from "../core/runtime/Secrets.js";
import { RuntimePaths } from "../core/runtime/RuntimePaths.js";
import { RuntimeStateStore } from "../core/runtime/RuntimeStateStore.js";
import { VersionCatalog, type RuntimeVersions } from "../core/runtime/VersionCatalog.js";
import { StatusService, type StatusSnapshot } from "../core/status/StatusService.js";
import { TerminalRenderer } from "../core/ui/TerminalRenderer.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface UpOptions {
  logLevel?: LogLevel;
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
  reset(): Promise<void>;
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
  const versionCatalog = new VersionCatalog();
  const statusService = new StatusService(
    () => dockerStackManager.runningServices(),
    {
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

    await dockerStackManager.logs(service);
  });

  return {
    async up(options = {}) {
      const logLevel = options.logLevel ?? "info";
      const state = stateStore.initialize();
      const versions = versionCatalog.resolve();
      const passwordRecord = createPasswordHash(state.auth.password);
      fs.mkdirSync(root, { recursive: true });
      bootstrapper.writeSeedSql(root, state, passwordRecord.passwordHash, passwordRecord.passwordSalt);
      bootstrapper.writeApiConfig(root, state, logLevel);
      bootstrapper.writeFrontendConfig(root, state);
      process.stdout.write(`${renderer.renderBanner()}\n`);
      await dockerStackManager.up(state, { frontendLogLevel: logLevel });
      await dockerStackManager.applySeedSql(state.auth.username);
      const configureSdkCommand = runnerSupervisor.buildUseHostAuthArgs();
      await commandRunner.run(configureSdkCommand.command, configureSdkCommand.args);
      const startCommand = runnerSupervisor.buildStartArgs({
        serverUrl: `127.0.0.1:${state.ports.runnerGrpc}`,
        agentApiUrl: `127.0.0.1:${state.ports.agentCliGrpc}`,
        logPath: runtimePaths.runnerLogPath(),
        secret: state.runner.secret,
        logLevel
      });
      await commandRunner.run(startCommand.command, startCommand.args);
      process.stdout.write(`${renderer.success(`API: http://127.0.0.1:${state.ports.apiHttp}/graphql`)}\n`);
      process.stdout.write(`${renderer.success(`UI: http://127.0.0.1:${state.ports.ui}`)}\n`);
      process.stdout.write(`CompanyHelm CLI: ${versions.cliPackage}\n`);
      process.stdout.write(`Runner package: ${versions.runnerPackage}\n`);
      process.stdout.write(`API image: ${versions.images.api}\n`);
      process.stdout.write(`Frontend image: ${versions.images.frontend}\n`);
      process.stdout.write(`Postgres image: ${versions.images.postgres}\n`);
      process.stdout.write(`username: ${state.auth.username}\n`);
      process.stdout.write(`password: ${state.auth.password}\n`);
    },
    async down() {
      if (!stateStore.load()) {
        return;
      }

      const stopCommand = runnerSupervisor.buildStopArgs();
      try {
        await commandRunner.run(stopCommand.command, stopCommand.args);
      } catch {
        // Ignore runner stop failures during teardown so container cleanup still happens.
      }

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
    async reset() {
      if (stateStore.load()) {
        const stopCommand = runnerSupervisor.buildStopArgs();
        try {
          await commandRunner.run(stopCommand.command, stopCommand.args);
        } catch {
          // Ignore runner stop failures during teardown so docker cleanup still runs.
        }
      }

      await dockerStackManager.down({ removeVolumes: true });
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}
