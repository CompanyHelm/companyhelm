import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentAskHumanQuestionTool } from "../src/services/agent/session/pi-mono/tools/inbox/ask_human_question.ts";
import { AgentInboxToolProvider } from "../src/services/agent/session/pi-mono/tools/inbox/provider.ts";

test("AgentInboxToolProvider contributes the ask-human-question tool", () => {
  const provider = new AgentInboxToolProvider({
    async createHumanQuestion() {
      throw new Error("inbox question creation is lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["ask_human_question"],
  );
});

test("AgentAskHumanQuestionTool returns a compact inbox acknowledgement", async () => {
  const tool = new AgentAskHumanQuestionTool({
    async createHumanQuestion() {
      return {
        agentId: "agent-1",
        agentName: "Research Agent",
        allowCustomAnswer: true,
        answer: null,
        companyId: "company-1",
        createdAt: new Date("2026-03-31T20:00:00.000Z"),
        id: "inbox-1",
        kind: "human_question",
        proposals: [],
        questionText: "Which path should I take?",
        resolvedAt: null,
        resolvedByUserId: null,
        sessionId: "session-1",
        sessionTitle: "Release plan",
        status: "open" as const,
        summary: "Which path should I take?",
        title: "Choose the rollout plan",
        toolCallId: "tool-call-1",
        updatedAt: new Date("2026-03-31T20:00:00.000Z"),
      };
    },
  } as never);

  const result = await tool.createDefinition().execute("tool-call-1", {
    allowCustomAnswer: true,
    proposals: [],
    questionText: "Which path should I take?",
    title: "Choose the rollout plan",
  });

  assert.deepEqual(result, {
    content: [{
      text: [
        "inboxItemId: inbox-1",
        "title: Choose the rollout plan",
        "status: open",
      ].join("\n"),
      type: "text",
    }],
    details: {
      inboxItemId: "inbox-1",
      status: "open",
      type: "inbox",
    },
  });
});
