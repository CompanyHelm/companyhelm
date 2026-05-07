import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentConversationToolProvider } from "../src/services/agent/session/pi-mono/tools/conversations/provider.ts";
import { AgentSendAgentMessageTool } from "../src/services/agent/session/pi-mono/tools/conversations/send_agent_message.ts";

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
    createNewSession: true,
    replyPolicy: "required",
    targetAgentId: "agent-2",
    text: "Can you review the migration?",
  });

  assert.equal(result.details?.conversationId, "conversation-1");
  assert.equal(result.details?.targetSessionId, "session-2");
  assert.match(result.content[0]?.text ?? "", /createdNewTargetSession: yes/);
});

test("AgentSendAgentMessageTool documents fresh-session routing", () => {
  const tool = new AgentSendAgentMessageTool({
    async sendMessage() {
      throw new Error("agent conversation sends are lazy");
    },
  } as never);

  assert.match(
    tool.createDefinition().description,
    /createNewSession to true with targetAgentId when you need a fresh session/,
  );
  assert.deepEqual(tool.createDefinition().promptGuidelines, [
    "Use send_agent_message to delegate work, ping another running agent session, or reply to an agent message using the targetSessionId from the delivery metadata.",
    "Set createNewSession to true with targetAgentId when you need a fresh session instead of reusing an existing one. This is required when routing work to another session of the same agent.",
    "Set replyPolicy to required when you need an answer, if_needed for substantive follow-up only, and none for acknowledgements, thanks, or closure-only messages that should not trigger another reply.",
    "Do not send acknowledgement-only ping-pong replies. If the conversation is already in a closure loop, stop replying.",
  ]);
});
