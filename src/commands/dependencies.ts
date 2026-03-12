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

export function createDefaultDependencies(): CommandDependencies {
  const root = runtimeRoot();
  const stateStore = new RuntimeStateStore(root);
  const runtimePaths = new RuntimePaths(root);
  const commandRunner = new CommandRunner();
  const renderer = new TerminalRenderer(process.stdout.isTTY);
  const dockerStackManager = new DockerStackManager(root, commandRunner);
  const runnerSupervisor = new RunnerSupervisor(runtimePaths.runnerConfigPath());
  const bootstrapper = new DeploymentBootstrapper();
  const statusService = new StatusService(() => dockerStackManager.runningServices());
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
    async up() {
      const state = stateStore.initialize();
      const passwordRecord = createPasswordHash(state.auth.password);
      fs.mkdirSync(root, { recursive: true });
      bootstrapper.writeSeedSql(root, state, passwordRecord.passwordHash, passwordRecord.passwordSalt);
      process.stdout.write(`${renderer.renderBanner()}\n`);
      await dockerStackManager.up(state);
      const startCommand = runnerSupervisor.buildStartArgs({
        grpcTarget: `127.0.0.1:${state.ports.runnerGrpc}`,
        secret: state.runner.secret
      });
      await commandRunner.run(startCommand.command, startCommand.args);
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
