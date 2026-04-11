import { injectable } from "inversify";
import { AgentEnvironmentBootstrapperInterface } from "./bootstrapper_interface.ts";
import { AgentEnvironmentShellInterface } from "./providers/shell_interface.ts";
import { AgentEnvironmentWorkspacePath } from "./workspace_path.ts";

/**
 * Creates the shared workspace root inside a provisioned environment so terminal tools and cloned
 * repositories always start from a stable writable location.
 */
@injectable()
export class AgentEnvironmentWorkspaceBootstrapper extends AgentEnvironmentBootstrapperInterface {
  async bootstrap(environmentShell: AgentEnvironmentShellInterface): Promise<void> {
    const result = await environmentShell.executeCommand(
      `sh -lc 'mkdir -p ${AgentEnvironmentWorkspaceBootstrapper.shellQuote(AgentEnvironmentWorkspacePath.get())}'`,
    );
    if (result.exitCode !== 0) {
      throw new Error(`Failed to provision environment workspace: ${result.stdout}`);
    }
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
