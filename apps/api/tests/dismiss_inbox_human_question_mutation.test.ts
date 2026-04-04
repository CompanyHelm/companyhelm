import assert from "node:assert/strict";
import { test } from "vitest";
import { DismissInboxHumanQuestionMutation } from "../src/graphql/mutations/dismiss_inbox_human_question.ts";

test("DismissInboxHumanQuestionMutation resolves the inbox item without creating an answer", async () => {
  const mutation = new DismissInboxHumanQuestionMutation({
    async dismissHumanQuestion(_transactionProvider: unknown, input: {
      companyId: string;
      inboxItemId: string;
      userId: string;
    }) {
      assert.deepEqual(input, {
        companyId: "company-123",
        inboxItemId: "inbox-1",
        userId: "user-123",
      });

      return {
        agentId: "agent-1",
        agentName: "Ops Agent",
        allowCustomAnswer: true,
        answer: null,
        companyId: "company-123",
        createdAt: new Date("2026-03-31T20:00:00.000Z"),
        id: "inbox-1",
        kind: "human_question" as const,
        proposals: [{
          answerText: "Wait until tomorrow morning.",
          cons: [],
          createdAt: new Date("2026-03-31T20:00:00.000Z"),
          id: "proposal-2",
          inboxItemId: "inbox-1",
          pros: ["Lower release risk"],
          rating: 5,
          sortOrder: 0,
        }],
        questionText: "Should I ship tonight or wait until tomorrow?",
        resolvedAt: new Date("2026-03-31T20:10:00.000Z"),
        resolvedByUserId: "user-123",
        sessionId: "session-1",
        sessionTitle: "Backend release review",
        status: "resolved" as const,
        summary: "Should I ship tonight or wait until tomorrow?",
        title: "Choose release timing",
        toolCallId: "tool-call-1",
        updatedAt: new Date("2026-03-31T20:10:00.000Z"),
      };
    },
  } as never);

  const result = await mutation.execute({}, {
    input: {
      inboxItemId: "inbox-1",
    },
  }, {
    app_runtime_transaction_provider: {} as never,
    authSession: {
      company: {
        id: "company-123",
        name: "Example Org",
      },
      user: {
        id: "user-123",
      },
    },
  } as never);

  assert.deepEqual(result, {
    agentId: "agent-1",
    agentName: "Ops Agent",
    allowCustomAnswer: true,
    answer: null,
    createdAt: "2026-03-31T20:00:00.000Z",
    id: "inbox-1",
    proposals: [{
      answerText: "Wait until tomorrow morning.",
      cons: [],
      id: "proposal-2",
      pros: ["Lower release risk"],
      rating: 5,
    }],
    questionText: "Should I ship tonight or wait until tomorrow?",
    resolvedAt: "2026-03-31T20:10:00.000Z",
    resolvedByUserId: "user-123",
    sessionId: "session-1",
    sessionTitle: "Backend release review",
    status: "resolved",
    summary: "Should I ship tonight or wait until tomorrow?",
    title: "Choose release timing",
    updatedAt: "2026-03-31T20:10:00.000Z",
  });
});
