import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentConversationMessageTemplate } from "../src/prompts/agent_conversation_message_template.ts";

test("AgentConversationMessageTemplate renders no-reply guidance", () => {
  const template = new AgentConversationMessageTemplate();

  const message = template.render({
    replyPolicy: "none",
    sourceAgentId: "agent-1",
    sourceAgentName: "CEO",
    sourceSessionId: "session-1",
    text: "Thanks for the review.",
  });

  assert.match(message, /No reply is expected/);
  assert.doesNotMatch(message, /Reply is required/);
});

test("AgentConversationMessageTemplate renders required-reply guidance", () => {
  const template = new AgentConversationMessageTemplate();

  const message = template.render({
    replyPolicy: "required",
    sourceAgentId: "agent-1",
    sourceAgentName: "CEO",
    sourceSessionId: "session-1",
    text: "Please review this diff and send findings.",
  });

  assert.match(message, /Reply is required/);
});
