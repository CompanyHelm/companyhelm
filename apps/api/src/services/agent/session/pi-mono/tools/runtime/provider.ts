import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentRuntimeToolService } from "./service.ts";
import { AgentRuntimeWaitTool } from "./wait.ts";

/**
 * Exposes runtime-wide control tools that should always be available regardless of environment
 * provider or active capability modules.
 */
export class AgentRuntimeToolProvider extends AgentToolProviderInterface {
  private readonly toolService: AgentRuntimeToolService;

  constructor(toolService: AgentRuntimeToolService) {
    super();
    this.toolService = toolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentRuntimeWaitTool(this.toolService).createDefinition(),
    ];
  }
}
