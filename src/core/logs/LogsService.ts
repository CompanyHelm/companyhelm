const MANAGED_SERVICES = new Set(["postgres", "api", "frontend", "runner"] as const);

export class LogsService {
  public constructor(private readonly streamServiceLogs: (service: "postgres" | "api" | "frontend" | "runner") => Promise<void>) {}

  public async stream(service: string): Promise<void> {
    if (!MANAGED_SERVICES.has(service as never)) {
      throw new Error(`Unknown service '${service}'. Expected one of: ${Array.from(MANAGED_SERVICES).join(", ")}`);
    }

    await this.streamServiceLogs(service as "postgres" | "api" | "frontend" | "runner");
  }
}
