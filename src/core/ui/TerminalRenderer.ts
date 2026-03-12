import chalk from "chalk";
import figlet from "figlet";

import type { StatusReport } from "../../commands/dependencies.js";
import type { ManagedServiceStatus } from "../status/StatusService.js";

export class TerminalRenderer {
  private readonly useColor: boolean;

  public constructor(useColor = true) {
    this.useColor = useColor;
  }

  public renderBanner(): string {
    const banner = figlet.textSync("COMPANYHELM", {
      horizontalLayout: "fitted"
    });

    return this.colorize(`COMPANYHELM\n${banner}`, "cyan");
  }

  public success(message: string): string {
    return `${this.colorize("[ok]", "green")} ${message}`;
  }

  public renderStatus(report: StatusReport): string {
    const lines = ["Status"];
    lines.push(this.renderServiceLine("Postgres", report.services.postgres));
    lines.push(this.renderServiceLine("API", report.services.api, report.apiUrl));
    lines.push(this.renderServiceLine("Frontend", report.services.frontend, report.uiUrl));
    lines.push(this.renderServiceLine("Runner", report.services.runner));

    if (report.username) {
      lines.push(`username: ${report.username}`);
    }

    return lines.join("\n");
  }

  private renderServiceLine(label: string, status: ManagedServiceStatus, detail?: string): string {
    const statusLabel = status === "running" ? this.success("running") : this.warn("stopped");
    return detail && status === "running" ? `${label}: ${statusLabel} (${detail})` : `${label}: ${statusLabel}`;
  }

  private warn(message: string): string {
    return `${this.colorize("[!]", "yellow")} ${message}`;
  }

  private colorize(text: string, color: "cyan" | "green" | "yellow"): string {
    if (!this.useColor) {
      return text;
    }

    return chalk[color](text);
  }
}
