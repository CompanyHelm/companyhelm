import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentActivateSkillTool } from "./activate.ts";
import { AgentSkillToolService } from "./service.ts";

/**
 * Groups the session skill tools behind one provider so the PI Mono tool catalog can expose
 * activation behavior without wiring each skill tool individually at the session root.
 */
export class AgentSkillToolProvider extends AgentToolProviderInterface {
  private readonly skillToolService: AgentSkillToolService;

  constructor(skillToolService: AgentSkillToolService) {
    super();
    this.skillToolService = skillToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentActivateSkillTool(this.skillToolService).createDefinition(),
    ] as unknown as ToolDefinition[];
  }
}
