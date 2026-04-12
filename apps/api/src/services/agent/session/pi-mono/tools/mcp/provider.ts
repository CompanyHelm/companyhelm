import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentMcpRemoteTool } from "./remote_tool.ts";
import type { AgentMcpToolDescriptor } from "./service.ts";
import { AgentMcpToolService } from "./service.ts";

/**
 * Groups all remote MCP-backed tool definitions for one session so PI Mono can add or remove the
 * whole discovered MCP catalog as one coherent capability slice.
 */
export class AgentMcpToolProvider extends AgentToolProviderInterface {
  private readonly descriptors: AgentMcpToolDescriptor[];
  private readonly toolService: AgentMcpToolService;

  constructor(
    toolService: AgentMcpToolService,
    descriptors: AgentMcpToolDescriptor[],
  ) {
    super();
    this.toolService = toolService;
    this.descriptors = descriptors;
  }

  createToolDefinitions(): ToolDefinition[] {
    return this.descriptors.map((descriptor) => {
      return new AgentMcpRemoteTool(this.toolService, descriptor).createDefinition();
    });
  }
}
