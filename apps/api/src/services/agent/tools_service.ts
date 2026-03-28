import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { AgentEnvironmentInterface } from "./compute/environment_interface.ts";

/**
 * Owns the provider-backed tool lifecycle for one agent runtime. It initializes the Daytona
 * sandbox tools before the session is created and performs cleanup when the runtime is disposed so
 * provider-backed resources such as tmux sessions are released at the end of the turn.
 */
export class AgentToolsService {
  private readonly environment: AgentEnvironmentInterface;
  private initializedTools: ToolDefinition[] | null = null;

  constructor(environment: AgentEnvironmentInterface) {
    this.environment = environment;
  }

  initializeTools(): ToolDefinition[] {
    if (this.initializedTools) {
      return this.initializedTools;
    }

    this.initializedTools = this.environment.listTools();

    return this.initializedTools;
  }

  async cleanupTools(): Promise<void> {
    await this.environment.dispose();
    this.initializedTools = null;
  }
}
