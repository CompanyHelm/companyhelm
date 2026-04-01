type AgentConversationDeliveryPromptInput = {
  sourceAgentId: string;
  sourceAgentName: string;
  sourceSessionId: string;
  text: string;
};

/**
 * Renders the queued cross-agent delivery text that lands in the target session. The prompt keeps
 * the sender identity explicit and tells the receiving agent exactly which session id to use when
 * replying with the send_agent_message tool.
 */
export class AgentConversationDeliveryPrompt {
  format(input: AgentConversationDeliveryPromptInput): string {
    return [
      "Agent-to-agent message",
      `Source agent name: ${input.sourceAgentName}`,
      `Source agent id: ${input.sourceAgentId}`,
      `Reply target session id: ${input.sourceSessionId}`,
      "Reply using send_agent_message with targetSessionId set to the reply target session id.",
      "",
      input.text,
    ].join("\n");
  }
}
