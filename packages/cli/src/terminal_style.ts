/**
 * Formats concise terminal status lines with ANSI color while keeping the command handlers focused on
 * provider login behavior. The output intentionally stays readable when colors are not interpreted.
 */
export class TerminalStyle {
  static readonly blue = "\u001B[34m";
  static readonly green = "\u001B[32m";
  static readonly gray = "\u001B[90m";
  static readonly reset = "\u001B[0m";
  static readonly yellow = "\u001B[33m";

  static detail(label: string, value: string): string {
    return `${TerminalStyle.gray}•${TerminalStyle.reset} ${label}: ${value}`;
  }

  static info(message: string): string {
    return `${TerminalStyle.blue}ℹ${TerminalStyle.reset} ${message}`;
  }

  static progress(message: string): string {
    return `${TerminalStyle.yellow}⏳${TerminalStyle.reset} ${message}`;
  }

  static success(message: string): string {
    return `${TerminalStyle.green}✅${TerminalStyle.reset} ${message}`;
  }
}
