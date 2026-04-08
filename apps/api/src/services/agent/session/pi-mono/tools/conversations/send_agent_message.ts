import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentConversationResultFormatter } from "./result_formatter.ts";
import { AgentConversationToolService } from "./service.ts";

/**
 * Sends one message from the current agent session to another agent or to a specific agent session.
 * The backing service resolves or creates the internal conversation automatically so the tool
 * surface can stay focused on delivery rather than routing internals.
 */
export class AgentSendAgentMessageTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    targetAgentId: Type.Optional(Type.String()),
    targetSessionId: Type.Optional(Type.String()),
    text: Type.String(),
  });

  private readonly conversationToolService: AgentConversationToolService;

  constructor(conversationToolService: AgentConversationToolService) {
    this.conversationToolService = conversationToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentSendAgentMessageTool.parameters> {
    return {
      description:
        "Send a message to another agent or to a specific agent session. Provide exactly one of targetAgentId or targetSessionId.",
      execute: async (_toolCallId, input) => {
        const result = await this.conversationToolService.sendMessage(input);
        return {
          content: [{
            text: AgentConversationResultFormatter.formatSentMessage(result),
            type: "text",
          }],
          details: {
            conversationId: result.conversationId,
            createdNewTargetSession: result.createdNewTargetSession,
            messageId: result.messageId,
            targetAgentId: result.targetAgentId,
            targetSessionId: result.targetSessionId,
            type: "agentConversationMessage",
          },
        };
      },
      label: "send_agent_message",
      name: "send_agent_message",
      parameters: AgentSendAgentMessageTool.parameters,
      promptGuidelines: [
        "Use send_agent_message to delegate work, ping another running agent session, or reply to an agent message using the targetSessionId from the delivery metadata. Answering back to the source agent is optional, only answer if you are adding meaningful information to the conversation.",
      ],
      promptSnippet: "Send a message to another agent",
    };
  }
}
