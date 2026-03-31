import { Sandbox } from "e2b";
import { AgentEnvironmentShellInterface } from "../shell_interface.ts";

/**
 * Adapts the E2B sandbox SDK into the shared shell contract used by tmux orchestration and other
 * tool runners. It intentionally narrows the provider surface down to direct command execution so
 * the rest of the session stack stays provider-agnostic.
 */
export class AgentComputeE2bShell extends AgentEnvironmentShellInterface {
  private readonly sandbox: Sandbox;

  constructor(sandbox: Sandbox) {
    super();
    this.sandbox = sandbox;
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
    const result = await this.sandbox.commands.run(command, {
      cwd: workingDirectory,
      envs: environment,
      timeoutMs: timeoutSeconds ? timeoutSeconds * 1000 : undefined,
    });

    return {
      exitCode: result.exitCode,
      stdout: [result.stdout, result.stderr].filter((value) => value.length > 0).join(""),
    };
  }
}
