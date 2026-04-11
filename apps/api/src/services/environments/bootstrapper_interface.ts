import { AgentEnvironmentShellInterface } from "./providers/shell_interface.ts";

/**
 * Defines one shared filesystem bootstrap step for provisioned environments. Concrete
 * bootstrappers keep each concern isolated so the provisioning flow can compose multiple setup
 * routines without collapsing them into one shell script blob.
 */
export abstract class AgentEnvironmentBootstrapperInterface {
  /**
   * Applies one bootstrap step through the provider shell before the environment is exposed to a
   * session lease.
   */
  abstract bootstrap(environmentShell: AgentEnvironmentShellInterface): Promise<void>;
}
