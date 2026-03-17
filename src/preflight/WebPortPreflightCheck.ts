import { PortAvailabilityPreflightCheck } from "./PortAvailabilityPreflightCheck.js";
import type { PreflightCheck } from "./PreflightCheck.js";

export class WebPortPreflightCheck implements PreflightCheck {
  private readonly delegate: PortAvailabilityPreflightCheck;

  public constructor(port: number) {
    this.delegate = new PortAvailabilityPreflightCheck("companyhelm-web", port);
  }

  public run(): Promise<void> {
    return this.delegate.run();
  }
}
