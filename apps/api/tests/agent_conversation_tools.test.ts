import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentConversationToolProvider } from "../src/services/agent/tools/conversations/provider.ts";
import { AgentSendAgentMessageTool } from "../src/services/agent/tools/conversations/send_agent_message.ts";

test("AgentConversationToolProvider contributes the send_agent_message tool", () => {
  const provider = new AgentConversationToolProvider({
    async sendMessage() {
      throw new Error("agent conversation sends are lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["send_agent_message"],
  );
});

test("AgentSendAgentMessageTool returns the resolved delivery metadata", async () => {
  const tool = new AgentSendAgentMessageTool({
    async sendMessage() {
      return {
        conversationId: "conversation-1",
        createdNewTargetSession: true,
        messageId: "message-1",
        targetAgentId: "agent-2",
        targetSessionId: "session-2",
      };
    },
  } as never);

  const result = await tool.createDefinition().execute("tool-call-1", {
    targetAgentId: "agent-2",
    text: "Can you review the migration?",
  });

  assert.equal(result.details?.conversationId, "conversation-1");
  assert.equal(result.details?.targetSessionId, "session-2");
  assert.match(result.content[0]?.text ?? "", /createdNewTargetSession: yes/);
});
