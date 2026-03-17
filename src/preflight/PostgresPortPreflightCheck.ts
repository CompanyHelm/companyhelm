import { PortAvailabilityPreflightCheck } from "./PortAvailabilityPreflightCheck.js";
import type { PreflightCheck } from "./PreflightCheck.js";

export class PostgresPortPreflightCheck implements PreflightCheck {
  private readonly delegate: PortAvailabilityPreflightCheck;

  public constructor(port = 5432) {
    this.delegate = new PortAvailabilityPreflightCheck("Postgres", port);
  }

  public run(): Promise<void> {
    return this.delegate.run();
  }
}
