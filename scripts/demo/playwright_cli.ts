import { spawn } from "node:child_process";

/**
 * Wraps the globally available playwright-cli binary with small async building blocks for local
 * demo scripts. Scenarios can compose these methods differently per task without copying shell
 * quoting or command orchestration into every demo file.
 */
export class DemoPlaywrightCli {
  async click(target: string): Promise<void> {
    await this.runCommand(["click", target]);
  }

  async close(): Promise<void> {
    await this.runCommand(["close"]);
  }

  async fill(target: string, text: string): Promise<void> {
    await this.runCommand(["fill", target, text]);
  }

  async goto(url: string): Promise<void> {
    await this.runCommand(["goto", url]);
  }

  async open(url?: string): Promise<void> {
    const arguments_ = ["open"];
    if (url) {
      arguments_.push(url);
    }
    await this.runCommand(arguments_);
  }

  async press(key: string): Promise<void> {
    await this.runCommand(["press", key]);
  }

  async runCode(code: string): Promise<void> {
    await this.runCommand(["run-code", code]);
  }

  async screenshot(filename?: string): Promise<void> {
    const arguments_ = ["screenshot"];
    if (filename) {
      arguments_.push(`--filename=${filename}`);
    }
    await this.runCommand(arguments_);
  }

  async snapshot(): Promise<void> {
    await this.runCommand(["snapshot"]);
  }

  async videoStart(filename: string): Promise<void> {
    await this.runCommand(["video-start", filename]);
  }

  async videoStop(): Promise<void> {
    await this.runCommand(["video-stop"]);
  }

  async waitForText(text: string, timeoutMilliseconds = 15000): Promise<void> {
    await this.runCode(`async page => {
  await page.getByText(${JSON.stringify(text)}).first().waitFor({ timeout: ${timeoutMilliseconds} });
}`);
  }

  async waitForUrlFragment(fragment: string, timeoutMilliseconds = 15000): Promise<void> {
    await this.runCode(`async page => {
  await page.waitForURL(url => url.toString().includes(${JSON.stringify(fragment)}), { timeout: ${timeoutMilliseconds} });
}`);
  }

  private runCommand(arguments_: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn("playwright-cli", arguments_, {
        stdio: "inherit",
      });
      childProcess.once("error", (error) => {
        reject(new Error(`Failed to launch playwright-cli. Make sure it is installed and on PATH. ${error instanceof Error ? error.message : String(error)}`));
      });
      childProcess.once("exit", (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`playwright-cli ${arguments_.join(" ")} failed with ${signal ?? `exit code ${code}`}.`));
      });
    });
  }
}
