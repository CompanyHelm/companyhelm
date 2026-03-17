import type { ResolvedServiceSources } from "../core/local/LocalRepoSourceResolver.js";
import type { CommandRunner } from "../core/process/CommandRunner.js";
import type { RuntimePorts, RuntimeState } from "../core/runtime/RuntimeState.js";
import type { ManagedServiceStatus } from "../core/status/StatusService.js";
import { DockerInstalledPreflightCheck } from "./DockerInstalledPreflightCheck.js";
import { ApiPortPreflightCheck } from "./ApiPortPreflightCheck.js";
import { PostgresPortPreflightCheck } from "./PostgresPortPreflightCheck.js";
import { WebPortPreflightCheck } from "./WebPortPreflightCheck.js";

interface StartupStatusSnapshot {
  postgres: ManagedServiceStatus;
  api: ManagedServiceStatus;
  frontend: ManagedServiceStatus;
}

interface StartupPreflightOptions {
  commandRunner: CommandRunner;
  currentState: RuntimeState | null;
  desiredSources: ResolvedServiceSources;
  ports: RuntimePorts;
  readStatus: () => Promise<StartupStatusSnapshot>;
}

export async function runStartupPreflightChecks(options: StartupPreflightOptions): Promise<void> {
  await new DockerInstalledPreflightCheck(options.commandRunner).run();
  const currentStatus = await options.readStatus();

  if (shouldCheckApiPort(options, currentStatus)) {
    await new ApiPortPreflightCheck(options.ports.apiHttp).run();
  }

  if (shouldCheckWebPort(options, currentStatus)) {
    await new WebPortPreflightCheck(options.ports.ui).run();
  }

  if (shouldCheckPostgresPort(options, currentStatus)) {
    await new PostgresPortPreflightCheck().run();
  }
}

function shouldCheckApiPort(options: StartupPreflightOptions, currentStatus: StartupStatusSnapshot): boolean {
  return shouldCheckServicePort(
    "api",
    options.currentState,
    currentStatus.api,
    options.desiredSources.api.source
  );
}

function shouldCheckWebPort(options: StartupPreflightOptions, currentStatus: StartupStatusSnapshot): boolean {
  return shouldCheckServicePort(
    "frontend",
    options.currentState,
    currentStatus.frontend,
    options.desiredSources.frontend.source
  );
}

function shouldCheckPostgresPort(options: StartupPreflightOptions, currentStatus: StartupStatusSnapshot): boolean {
  if (options.desiredSources.api.source !== "local") {
    return false;
  }

  return currentStatus.postgres !== "running";
}

function shouldCheckServicePort(
  service: "api" | "frontend",
  currentState: RuntimeState | null,
  currentStatus: ManagedServiceStatus,
  desiredSource: "docker" | "local"
): boolean {
  if (currentStatus !== "running") {
    return true;
  }

  const currentService = currentState?.services[service];
  if (!currentService) {
    return true;
  }

  if (currentService.source === "docker") {
    return desiredSource !== "docker";
  }

  return false;
}
