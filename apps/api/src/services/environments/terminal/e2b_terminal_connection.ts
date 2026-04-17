import type { CommandHandle, Sandbox } from "e2b";

/**
 * Wraps one native E2B PTY client that is attached to a durable tmux session. Closing the browser
 * should detach this client, while the tmux session keeps the shell state available for later tabs.
 */
export class EnvironmentE2bTerminalConnection {
  private readonly sandbox: Sandbox;
  private readonly terminal: CommandHandle;

  constructor(sandbox: Sandbox, terminal: CommandHandle) {
    this.sandbox = sandbox;
    this.terminal = terminal;
  }

  getPid(): number {
    return this.terminal.pid;
  }

  async attachTmuxSession(terminalSessionId: string): Promise<void> {
    await this.sendInput(
      [
        "mkdir -p ~/workspace",
        `exec tmux new-session -A -s ${EnvironmentE2bTerminalConnection.shellQuote(terminalSessionId)} -c ~/workspace`,
        "",
      ].join("\n"),
    );
  }

  async sendInput(input: string): Promise<void> {
    await this.sandbox.pty.sendInput(
      this.terminal.pid,
      new TextEncoder().encode(input),
    );
  }

  async resize(columns: number, rows: number): Promise<void> {
    await this.sandbox.pty.resize(this.terminal.pid, {
      cols: columns,
      rows,
    });
  }

  async waitForExit(): Promise<number | null> {
    try {
      const result = await this.terminal.wait();
      return result.exitCode;
    } catch (error) {
      const exitCode = (error as { exitCode?: unknown }).exitCode;
      return typeof exitCode === "number" ? exitCode : null;
    }
  }

  async detachClient(): Promise<void> {
    await this.terminal.kill().catch(() => false);
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
