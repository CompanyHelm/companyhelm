import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentSendAgentMessageTool } from "./send_agent_message.ts";
import { AgentConversationToolService } from "./service.ts";

/**
 * Groups the agent-to-agent messaging surface behind one provider so PI Mono can expose the
 * orchestration entrypoint without the runtime bootstrap knowing each tool implementation.
 */
export class AgentConversationToolProvider extends AgentToolProviderInterface {
  private readonly conversationToolService: AgentConversationToolService;

  constructor(conversationToolService: AgentConversationToolService) {
    super();
    this.conversationToolService = conversationToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentSendAgentMessageTool(this.conversationToolService).createDefinition(),
    ];
  }
}
