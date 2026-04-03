import { AgentEnvironmentShellInterface } from "./shell_interface.ts";

export type AgentEnvironmentShellPrivilegeMode = "root" | "passwordless-sudo" | "unprivileged";

/**
 * Probes and caches which privilege level is available through the generic environment shell.
 * Shared infrastructure such as tmux setup can use this without hardcoding provider-specific
 * assumptions about the remote user account.
 */
export class AgentEnvironmentShellPrivilegeProbe {
  private readonly environmentShell: AgentEnvironmentShellInterface;
  private privilegeMode: AgentEnvironmentShellPrivilegeMode | null = null;

  constructor(environmentShell: AgentEnvironmentShellInterface) {
    this.environmentShell = environmentShell;
  }

  /**
   * Resolves whether the remote shell is already root, supports passwordless sudo, or is fully
   * unprivileged. The result is cached because the answer is stable for the lifetime of a shell.
   */
  async getPrivilegeMode(): Promise<AgentEnvironmentShellPrivilegeMode> {
    if (this.privilegeMode) {
      return this.privilegeMode;
    }

    const userIdResult = await this.environmentShell.executeCommand("id -u");
    if (userIdResult.exitCode === 0 && userIdResult.stdout.trim() === "0") {
      this.privilegeMode = "root";
      return this.privilegeMode;
    }

    const sudoResult = await this.environmentShell.executeCommand("sudo -n true");
    this.privilegeMode = sudoResult.exitCode === 0 ? "passwordless-sudo" : "unprivileged";
    return this.privilegeMode;
  }
}
