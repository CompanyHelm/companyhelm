/**
 * Centralizes the logical workspace path exposed to agents. Keeping it HOME-relative lets each
 * compute provider land the agent in the current sandbox user's home directory without hardcoding
 * provider-specific absolute paths.
 */
export class AgentEnvironmentWorkspacePath {
  /**
   * Returns the shared agent workspace path relative to the remote user's home directory.
   */
  static get(): string {
    return "~/workspace";
  }
}
