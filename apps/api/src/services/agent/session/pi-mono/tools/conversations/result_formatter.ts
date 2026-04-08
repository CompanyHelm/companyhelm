import type { AgentConversationSendMessageResult } from "../../../../../conversations/service.ts";

/**
 * Formats the minimal delivery metadata the agent needs after sending a message so follow-up calls
 * can target the resolved session directly without exposing the internal conversation model.
 */
export class AgentConversationResultFormatter {
  static formatSentMessage(result: AgentConversationSendMessageResult): string {
    return [
      `messageId: ${result.messageId}`,
      `conversationId: ${result.conversationId}`,
      `targetAgentId: ${result.targetAgentId}`,
      `targetSessionId: ${result.targetSessionId}`,
      `createdNewTargetSession: ${result.createdNewTargetSession ? "yes" : "no"}`,
    ].join("\n");
  }
}
