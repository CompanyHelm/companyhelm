import { spawn } from "node:child_process";

export class CommandRunner {
  public run(command: string, args: string[], cwd?: string, env?: NodeJS.ProcessEnv): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: {
          ...process.env,
          ...env
        },
        stdio: "inherit"
      });

      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
      });
    });
  }

  public capture(command: string, args: string[], cwd?: string, env?: NodeJS.ProcessEnv): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: {
          ...process.env,
          ...env
        },
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve(stdout);
          return;
        }

        reject(new Error(stderr || `${command} exited with code ${code ?? "unknown"}`));
      });
    });
  }
}
