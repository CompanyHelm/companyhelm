import { spawn } from "node:child_process";

export class CommandRunner {
  public run(command: string, args: string[], cwd?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
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
}
