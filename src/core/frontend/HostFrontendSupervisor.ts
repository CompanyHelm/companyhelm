import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { CommandRunner } from "../process/CommandRunner.js";

export class HostFrontendSupervisor {
  public constructor(
    private readonly repoRoot: string,
    private readonly pidPath: string,
    private readonly logPath: string,
    private readonly commandRunner = new CommandRunner()
  ) {}

  public isEnabled(): boolean {
    return process.arch === "arm64" && fs.existsSync(path.join(this.repoRoot, "package.json"));
  }

  public async start(configPath: string, port: number): Promise<void> {
    fs.mkdirSync(path.dirname(this.pidPath), { recursive: true });

    if (this.isRunning()) {
      await this.stop();
    }

    await this.commandRunner.run("npm", ["run", "build", "--", "--config-path", configPath], this.repoRoot);

    const logFd = fs.openSync(this.logPath, "a");
    const child = spawn("npm", ["exec", "--", "vite", "preview", "--host", "0.0.0.0", "--port", String(port)], {
      cwd: this.repoRoot,
      detached: true,
      stdio: ["ignore", logFd, logFd]
    });

    child.unref();
    fs.closeSync(logFd);
    fs.writeFileSync(this.pidPath, `${child.pid}\n`, "utf8");

    await this.waitUntilReady(port);
  }

  public async stop(): Promise<void> {
    const pid = this.readPid();
    if (!pid) {
      return;
    }

    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Ignore stale pid files.
      }
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (!this.isRunning()) {
        break;
      }

      await delay(250);
    }

    fs.rmSync(this.pidPath, { force: true });
  }

  public isRunning(): boolean {
    const pid = this.readPid();
    if (!pid) {
      return false;
    }

    try {
      process.kill(pid, 0);
      return true;
    } catch {
      fs.rmSync(this.pidPath, { force: true });
      return false;
    }
  }

  public streamLogs(): void {
    if (!fs.existsSync(this.logPath)) {
      return;
    }

    process.stdout.write(fs.readFileSync(this.logPath, "utf8"));
  }

  private async waitUntilReady(port: number): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (!this.isRunning()) {
        break;
      }

      try {
        const response = await fetch(`http://127.0.0.1:${port}`);
        if (response.ok) {
          return;
        }

        lastError = new Error(`Frontend preview returned HTTP ${response.status}.`);
      } catch (error) {
        lastError = error as Error;
      }

      await delay(500);
    }

    throw lastError ?? new Error("Frontend preview did not become ready.");
  }

  private readPid(): number | null {
    if (!fs.existsSync(this.pidPath)) {
      return null;
    }

    const value = Number.parseInt(fs.readFileSync(this.pidPath, "utf8").trim(), 10);
    return Number.isFinite(value) ? value : null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
