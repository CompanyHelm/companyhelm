export type ManagedServiceStatus = "running" | "stopped";

export interface StatusSnapshot {
  postgres: ManagedServiceStatus;
  api: ManagedServiceStatus;
  frontend: ManagedServiceStatus;
  runner: ManagedServiceStatus;
}

export interface StatusOverrides {
  runner?: () => Promise<boolean> | boolean;
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
    const runnerRunning = this.overrides.runner ? await this.overrides.runner() : running.has("runner");

    return {
      postgres: running.has("postgres") ? "running" : "stopped",
      api: running.has("api") ? "running" : "stopped",
      frontend: running.has("frontend") ? "running" : "stopped",
      runner: runnerRunning ? "running" : "stopped"
    };
  }
}
