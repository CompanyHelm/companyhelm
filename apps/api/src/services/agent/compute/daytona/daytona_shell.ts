import { AgentEnvironmentShellInterface } from "../shell_interface.ts";

type DaytonaRemoteSandbox = {
  process: {
    executeCommand(
      command: string,
      cwd?: string,
      env?: Record<string, string>,
      timeout?: number,
    ): Promise<{
      artifacts?: {
        stdout?: string;
      };
      exitCode: number;
      result: string;
    }>;
  };
};

/**
 * Adapts the Daytona sandbox SDK into the generic environment shell contract. It intentionally
 * exposes only direct remote command execution so shared PTY/session managers can be layered on
 * top without inheriting Daytona-specific SDK details.
 */
export class AgentComputeDaytonaShell extends AgentEnvironmentShellInterface {
  private readonly remoteSandbox: DaytonaRemoteSandbox;

  constructor(remoteSandbox: DaytonaRemoteSandbox) {
    super();
    this.remoteSandbox = remoteSandbox;
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
    const result = await this.remoteSandbox.process.executeCommand(
      command,
      workingDirectory,
      environment,
      timeoutSeconds,
    );

    return {
      exitCode: result.exitCode,
      stdout: result.artifacts?.stdout ?? result.result,
    };
  }
}
