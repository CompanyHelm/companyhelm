import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DeploymentBootstrapper } from "../core/bootstrap/DeploymentBootstrapper.js";
import { DockerStackManager } from "../core/docker/DockerStackManager.js";
import { HostFrontendSupervisor } from "../core/frontend/HostFrontendSupervisor.js";
import { LogsService } from "../core/logs/LogsService.js";
import { CommandRunner } from "../core/process/CommandRunner.js";
import { RunnerSupervisor } from "../core/runner/RunnerSupervisor.js";
import { createPasswordHash } from "../core/runtime/Secrets.js";
import { RuntimePaths } from "../core/runtime/RuntimePaths.js";
import { RuntimeStateStore } from "../core/runtime/RuntimeStateStore.js";
import { StatusService, type StatusSnapshot } from "../core/status/StatusService.js";
import { TerminalRenderer } from "../core/ui/TerminalRenderer.js";

export interface CommandDependencies {
  up(): Promise<void>;
  down(): Promise<void>;
  status(): Promise<StatusSnapshot>;
  logs(service: string): Promise<void>;
  reset(): Promise<void>;
}

function runtimeRoot(): string {
  return process.env.COMPANYHELM_HOME || path.join(os.homedir(), ".companyhelm");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createDefaultDependencies(): CommandDependencies {
  const root = runtimeRoot();
  const packageRoot = path.resolve(__dirname, "../..");
  const siblingFrontendRoot = path.resolve(packageRoot, "..", "frontend");
  const stateStore = new RuntimeStateStore(root);
  const runtimePaths = new RuntimePaths(root);
  const commandRunner = new CommandRunner();
  const renderer = new TerminalRenderer(process.stdout.isTTY);
  const frontendSupervisor = new HostFrontendSupervisor(
    siblingFrontendRoot,
    runtimePaths.frontendPidPath(),
    runtimePaths.frontendLogPath(),
    commandRunner
  );
  const dockerStackManager = new DockerStackManager(root, commandRunner, undefined, !frontendSupervisor.isEnabled());
  const runnerSupervisor = new RunnerSupervisor(runtimePaths.runnerConfigPath());
  const bootstrapper = new DeploymentBootstrapper();
  const statusService = new StatusService(
    () => dockerStackManager.runningServices(),
    {
      ...(frontendSupervisor.isEnabled()
        ? {
            frontend: () => frontendSupervisor.isRunning()
          }
        : {}),
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

    if (service === "frontend" && frontendSupervisor.isEnabled()) {
      frontendSupervisor.streamLogs();
      return;
    }

    await dockerStackManager.logs(service);
  });

  return {
    async up() {
      const state = stateStore.initialize();
      const passwordRecord = createPasswordHash(state.auth.password);
      fs.mkdirSync(root, { recursive: true });
      bootstrapper.writeSeedSql(root, state, passwordRecord.passwordHash, passwordRecord.passwordSalt);
      bootstrapper.writeApiConfig(root, state);
      bootstrapper.writeFrontendConfig(root, state);
      process.stdout.write(`${renderer.renderBanner()}\n`);
      await dockerStackManager.up(state);
      await dockerStackManager.applySeedSql();
      const configureSdkCommand = runnerSupervisor.buildUseHostAuthArgs();
      await commandRunner.run(configureSdkCommand.command, configureSdkCommand.args);
      const startCommand = runnerSupervisor.buildStartArgs({
        serverUrl: `127.0.0.1:${state.ports.runnerGrpc}`,
        agentApiUrl: `127.0.0.1:${state.ports.agentCliGrpc}`,
        logPath: runtimePaths.runnerLogPath(),
        secret: state.runner.secret
      });
      await commandRunner.run(startCommand.command, startCommand.args);
      if (frontendSupervisor.isEnabled()) {
        await frontendSupervisor.start(runtimePaths.frontendConfigPath(), state.ports.ui);
      }
      process.stdout.write(`${renderer.success(`API: http://127.0.0.1:${state.ports.apiHttp}/graphql`)}\n`);
      process.stdout.write(`${renderer.success(`UI: http://127.0.0.1:${state.ports.ui}`)}\n`);
      process.stdout.write(`admin password: ${state.auth.password}\n`);
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

      if (frontendSupervisor.isEnabled()) {
        await frontendSupervisor.stop();
      }

      await dockerStackManager.down();
    },
    status() {
      return statusService.read();
    },
    logs(service: string) {
      return logsService.stream(service);
    },
    async reset() {
      await this.down();
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}
