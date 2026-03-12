export type ManagedServiceStatus = "running" | "stopped";

export interface StatusSnapshot {
  postgres: ManagedServiceStatus;
  api: ManagedServiceStatus;
  frontend: ManagedServiceStatus;
  runner: ManagedServiceStatus;
}

export class StatusService {
  public constructor(private readonly listRunningServices: () => Promise<string>) {}

  public async read(): Promise<StatusSnapshot> {
    const running = new Set(
      (await this.listRunningServices())
        .split("\n")
        .map((service) => service.trim())
        .filter(Boolean)
    );

    return {
      postgres: running.has("postgres") ? "running" : "stopped",
      api: running.has("api") ? "running" : "stopped",
      frontend: running.has("frontend") ? "running" : "stopped",
      runner: running.has("runner") ? "running" : "stopped"
    };
  }
}
