import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentAskHumanQuestionTool } from "./ask_human_question.ts";
import { AgentInboxToolService } from "./service.ts";

/**
 * Contributes the inbox-facing agent tools so human escalation lives in one provider alongside the
 * supporting service that binds the current session context.
 */
export class AgentInboxToolProvider extends AgentToolProviderInterface {
  private readonly inboxToolService: AgentInboxToolService;

  constructor(inboxToolService: AgentInboxToolService) {
    super();
    this.inboxToolService = inboxToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentAskHumanQuestionTool(this.inboxToolService).createDefinition(),
    ];
  }
}
