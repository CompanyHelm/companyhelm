import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentListAssignedSecretsTool } from "./list_assigned.ts";
import { AgentListAvailableSecretsTool } from "./list_available.ts";
import { AgentSecretToolService } from "./service.ts";

/**
 * Groups the read-only secret inspection tools behind one provider so the PI Mono session can
 * expose secret visibility without coupling the shared tool catalog to secret-specific logic.
 */
export class AgentSecretToolProvider extends AgentToolProviderInterface {
  private readonly secretToolService: AgentSecretToolService;

  constructor(secretToolService: AgentSecretToolService) {
    super();
    this.secretToolService = secretToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentListAssignedSecretsTool(this.secretToolService).createDefinition(),
      new AgentListAvailableSecretsTool(this.secretToolService).createDefinition(),
    ];
  }
}
