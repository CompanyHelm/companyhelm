import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentWebFetchTool } from "./fetch.ts";
import { AgentWebSearchTool } from "./search.ts";
import { AgentWebToolService } from "./service.ts";

/**
 * Groups Exa-backed web discovery and retrieval tools so the shared tool catalog can expose web
 * access without coupling the session manager to the individual tool definitions.
 */
export class AgentWebToolProvider extends AgentToolProviderInterface {
  private readonly webToolService: AgentWebToolService;

  constructor(webToolService: AgentWebToolService) {
    super();
    this.webToolService = webToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentWebSearchTool(this.webToolService).createDefinition(),
      new AgentWebFetchTool(this.webToolService).createDefinition(),
    ];
  }
}
