export type ManagedServiceStatus = "running" | "stopped";

export interface StatusSnapshot {
  postgres: ManagedServiceStatus;
  api: ManagedServiceStatus;
  frontend: ManagedServiceStatus;
  runner: ManagedServiceStatus;
}

export interface StatusOverrides {
  api?: () => Promise<boolean | undefined> | boolean | undefined;
  frontend?: () => Promise<boolean | undefined> | boolean | undefined;
  runner?: () => Promise<boolean | undefined> | boolean | undefined;
}

export class StatusService {
  public constructor(
    private readonly listRunningServices: () => Promise<string>,
    private readonly overrides: StatusOverrides = {}
  ) {}

  public async read(): Promise<StatusSnapshot> {
    const running = new Set(
      (await this.listRunningServices())
        .split("\n")
        .map((service) => service.trim())
        .filter(Boolean)
    );
    const apiRunning = await this.resolveServiceRunning("api", this.overrides.api, running);
    const frontendRunning = await this.resolveServiceRunning("frontend", this.overrides.frontend, running);
    const runnerRunning = await this.resolveServiceRunning("runner", this.overrides.runner, running);

    return {
      postgres: running.has("postgres") ? "running" : "stopped",
      api: apiRunning ? "running" : "stopped",
      frontend: frontendRunning ? "running" : "stopped",
      runner: runnerRunning ? "running" : "stopped"
    };
  }

  private async resolveServiceRunning(
    service: "api" | "frontend" | "runner",
    override: (() => Promise<boolean | undefined> | boolean | undefined) | undefined,
    running: Set<string>
  ): Promise<boolean> {
    if (!override) {
      return running.has(service);
    }

    const result = await override();
    return typeof result === "boolean" ? result : running.has(service);
  }
}
