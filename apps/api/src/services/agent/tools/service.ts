import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentEnvironmentPromptScope } from "../environment/prompt_scope.ts";
import { AgentToolProviderInterface } from "./provider_interface.ts";

/**
 * Aggregates tool providers for one prompt run. Concrete tool providers own the actual tool
 * definitions, while this service only caches the combined catalog and coordinates prompt-scope
 * cleanup after the PI Mono run ends.
 */
export class AgentToolsService {
  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly toolProviders: AgentToolProviderInterface[];
  private initializedTools: ToolDefinition[] | null = null;

  constructor(
    promptScope: AgentEnvironmentPromptScope,
    toolProviders: AgentToolProviderInterface[],
  ) {
    this.promptScope = promptScope;
    this.toolProviders = toolProviders;
  }

  initializeTools(): ToolDefinition[] {
    if (this.initializedTools) {
      return this.initializedTools;
    }

    this.initializedTools = this.toolProviders.flatMap((toolProvider) => toolProvider.createToolDefinitions());

    return this.initializedTools;
  }

  async cleanupTools(): Promise<void> {
    await this.promptScope.dispose();
    this.initializedTools = null;
  }
}
