import chalk from "chalk";
import figlet from "figlet";

import type { StatusReport } from "../../commands/dependencies.js";
import type { ManagedServiceStatus } from "../status/StatusService.js";

export class TerminalRenderer {
  private readonly useColor: boolean;
  private static readonly OSC = "\u001B]";
  private static readonly BEL = "\u0007";

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

  public progress(message: string): string {
    return this.colorize(`... ${message}`, "cyan");
  }

  public successHighlight(message: string): string {
    if (!this.useColor) {
      return message;
    }

    return chalk.green.bold(message);
  }

  public clickableUrl(url: string): string {
    if (!this.useColor) {
      return url;
    }

    const display = this.successHighlight(url);
    return `${TerminalRenderer.OSC}8;;${url}${TerminalRenderer.BEL}${display}${TerminalRenderer.OSC}8;;${TerminalRenderer.BEL}`;
  }

  public renderStatus(report: StatusReport): string {
    const lines = ["Status"];
    lines.push(this.renderServiceLine("Postgres", report.services.postgres));
    lines.push(this.renderServiceLine("API", report.services.api, report.apiUrl));
    lines.push(this.renderServiceLine("Frontend", report.services.frontend, report.uiUrl));
    lines.push(this.renderServiceLine("Runner", report.services.runner));

    if (report.versions) {
      lines.push(`CompanyHelm CLI: ${report.versions.cliPackage}`);
      lines.push(`Runner package: ${report.versions.runnerPackage}`);
      lines.push(`API image: ${report.versions.images.api}`);
      lines.push(`Frontend image: ${report.versions.images.frontend}`);
      lines.push(`Postgres image: ${report.versions.images.postgres}`);
    }

    if (report.username) {
      lines.push(`username: ${report.username}`);
    }

    return lines.join("\n");
  }

  private renderServiceLine(label: string, status: ManagedServiceStatus, detail?: string): string {
    const statusLabel = status === "running" ? this.success("running") : this.warn("stopped");
    return detail && status === "running"
      ? `${label}: ${statusLabel} (${this.formatDetail(detail)})`
      : `${label}: ${statusLabel}`;
  }

  private warn(message: string): string {
    return `${this.colorize("[!]", "yellow")} ${message}`;
  }

  private formatDetail(detail: string): string {
    return detail.startsWith("http://") || detail.startsWith("https://") ? this.clickableUrl(detail) : detail;
  }

  private colorize(text: string, color: "cyan" | "green" | "yellow"): string {
    if (!this.useColor) {
      return text;
    }

    return chalk[color](text);
  }
}
