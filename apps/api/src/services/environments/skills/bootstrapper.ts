import { injectable } from "inversify";
import { AgentEnvironmentBootstrapperInterface } from "../bootstrapper_interface.ts";
import { AgentEnvironmentShellInterface } from "../providers/shell_interface.ts";
import { AgentEnvironmentSkillPathService } from "./path_service.ts";

/**
 * Creates the shared skill cache and the environment-facing user skill directory so later sync
 * steps can materialize file-backed skills without re-creating root folders on every activation.
 */
@injectable()
export class AgentEnvironmentSkillBootstrapper extends AgentEnvironmentBootstrapperInterface {
  private readonly pathService: AgentEnvironmentSkillPathService;

  constructor(
    pathService: AgentEnvironmentSkillPathService = new AgentEnvironmentSkillPathService(),
  ) {
    super();
    this.pathService = pathService;
  }

  async bootstrap(environmentShell: AgentEnvironmentShellInterface): Promise<void> {
    const result = await environmentShell.executeCommand(
      [
        "sh -lc",
        AgentEnvironmentSkillBootstrapper.shellQuote([
          "mkdir -p",
          AgentEnvironmentSkillBootstrapper.shellQuote(this.pathService.getSkillCacheRootDirectory()),
          AgentEnvironmentSkillBootstrapper.shellQuote(this.pathService.getSkillRootDirectory()),
        ].join(" ")),
      ].join(" "),
    );
    if (result.exitCode !== 0) {
      throw new Error(`Failed to provision environment skill roots: ${result.stdout}`);
    }
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
