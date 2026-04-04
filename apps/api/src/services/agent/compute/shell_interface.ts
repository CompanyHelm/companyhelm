/**
 * Exposes the minimal remote shell primitive needed by higher-level PTY implementations. Provider
 * adapters implement this once so reusable PTY managers such as tmux can drive remote sessions
 * without depending on provider-specific SDK types.
 */
export class AgentEnvironmentShellTimeoutError extends Error {
  readonly command: string;
  readonly provider: string;
  readonly timeoutSeconds: number | null;
  readonly workingDirectory: string | null;

  constructor(
    provider: string,
    command: string,
    timeoutSeconds?: number,
    workingDirectory?: string,
    cause?: unknown,
  ) {
    super(`${provider} shell command timed out.`, {
      cause,
    });
    this.name = "AgentEnvironmentShellTimeoutError";
    this.provider = provider;
    this.command = command;
    this.timeoutSeconds = timeoutSeconds ?? null;
    this.workingDirectory = workingDirectory ?? null;
  }
}

export abstract class AgentEnvironmentShellInterface {
  /**
   * Executes one command directly on the provisioned environment and returns its combined textual
   * output plus exit code. Callers use this to bootstrap and manipulate remote PTY implementations.
   */
  abstract executeCommand(
    command: string,
    workingDirectory?: string,
    environment?: Record<string, string>,
    timeoutSeconds?: number,
  ): Promise<{
    exitCode: number;
    stdout: string;
  }>;
}
