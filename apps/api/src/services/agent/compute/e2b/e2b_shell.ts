import { Sandbox } from "e2b";
import type { Logger as PinoLogger } from "pino";
import { AgentEnvironmentShellInterface } from "../shell_interface.ts";

type E2bCommandExitError = {
  code?: number | string;
  message?: string;
  name?: string;
  result?: {
    exitCode?: number;
    stderr?: string;
    stdout?: string;
  };
};

type ShellLogger = Pick<PinoLogger, "warn">;

const NOOP_LOGGER = {
  warn() {
    return undefined;
  },
} as ShellLogger;

/**
 * Adapts the E2B sandbox SDK into the shared shell contract used by tmux orchestration and other
 * tool runners. It intentionally narrows the provider surface down to direct command execution so
 * the rest of the session stack stays provider-agnostic.
 */
export class AgentComputeE2bShell extends AgentEnvironmentShellInterface {
  private readonly sandbox: Sandbox;
  private readonly logger: ShellLogger;

  constructor(sandbox: Sandbox, logger: ShellLogger = NOOP_LOGGER) {
    super();
    this.sandbox = sandbox;
    this.logger = logger;
  }

  async executeCommand(
    command: string,
    workingDirectory?: string,
    environment?: Record<string, string>,
    timeoutSeconds?: number,
  ): Promise<{
      exitCode: number;
      stdout: string;
  }> {
    try {
      const result = await this.sandbox.commands.run(command, {
        cwd: workingDirectory,
        envs: environment,
        timeoutMs: timeoutSeconds ? timeoutSeconds * 1000 : undefined,
      });

      return {
        exitCode: result.exitCode,
        stdout: [result.stdout, result.stderr].filter((value) => value.length > 0).join(""),
      };
    } catch (error) {
      const commandExitError = error as E2bCommandExitError;
      const exitCode = commandExitError.result?.exitCode;
      if (typeof exitCode !== "number") {
        if (this.isTimeoutError(commandExitError)) {
          this.logger.warn({
            command,
            err: error,
            timeoutSeconds: timeoutSeconds ?? null,
            workingDirectory: workingDirectory ?? null,
          }, "e2b shell command timed out");
        }
        throw error;
      }

      return {
        exitCode,
        stdout: [
          commandExitError.result?.stdout ?? "",
          commandExitError.result?.stderr ?? "",
        ].filter((value) => value.length > 0).join(""),
      };
    }
  }

  private isTimeoutError(error: E2bCommandExitError): boolean {
    const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
    const message = typeof error.message === "string" ? error.message.toLowerCase() : "";

    return code.includes("deadline_exceeded")
      || message.includes("deadline_exceeded")
      || (message.includes("operation timed out") && message.includes("timeoutms"));
  }
}
