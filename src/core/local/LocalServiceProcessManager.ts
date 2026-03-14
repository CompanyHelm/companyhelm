import fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

import type { LocalManagedServiceRuntime } from "../runtime/RuntimeState.js";

export interface LocalProcessStartInput {
  serviceName: "api" | "frontend";
  repoPath: string;
  command: string;
  args: string[];
  logPath: string;
  env?: NodeJS.ProcessEnv;
}

export class LocalServiceProcessManager {
  public start(input: LocalProcessStartInput): LocalManagedServiceRuntime {
    fs.mkdirSync(path.dirname(input.logPath), { recursive: true });
    fs.writeFileSync(
      input.logPath,
      `\n[companyhelm] starting ${input.serviceName}: ${input.command} ${input.args.join(" ")}\n`,
      { flag: "a" }
    );
    const logFd = fs.openSync(input.logPath, "a");
    const child = spawn(input.command, input.args, {
      cwd: input.repoPath,
      env: {
        ...process.env,
        ...input.env
      },
      stdio: ["ignore", logFd, logFd],
      detached: true
    });
    child.unref();
    fs.closeSync(logFd);

    return {
      source: "local",
      repoPath: input.repoPath,
      logPath: input.logPath,
      pid: child.pid ?? 0
    };
  }

  public isRunning(runtime: LocalManagedServiceRuntime): boolean {
    return runtime.pid > 0 && this.isPidRunning(runtime.pid);
  }

  public async stop(runtime: LocalManagedServiceRuntime): Promise<void> {
    if (!this.isRunning(runtime)) {
      return;
    }

    this.kill(runtime.pid, "SIGTERM");
    const exitedAfterSigTerm = await this.waitForExit(runtime.pid, 5000);
    if (!exitedAfterSigTerm) {
      this.kill(runtime.pid, "SIGKILL");
      await this.waitForExit(runtime.pid, 2000);
    }
  }

  public printLogs(runtime: LocalManagedServiceRuntime): void {
    if (!fs.existsSync(runtime.logPath)) {
      return;
    }

    process.stdout.write(fs.readFileSync(runtime.logPath, "utf8"));
  }

  private kill(pid: number, signal: NodeJS.Signals): void {
    try {
      process.kill(-pid, signal);
      return;
    } catch {
      // Fall through to direct child kill.
    }

    try {
      process.kill(pid, signal);
    } catch {
      // Ignore stale pid files.
    }
  }

  private isPidRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private async waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!this.isPidRunning(pid)) {
        return true;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    }
    return !this.isPidRunning(pid);
  }
}
