import chalk from "chalk";
import figlet from "figlet";

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

  private colorize(text: string, color: "cyan" | "green"): string {
    if (!this.useColor) {
      return text;
    }

    return chalk[color](text);
  }
}
