import assert from "node:assert/strict";
import { test } from "vitest";
import { InboxHumanQuestionsQueryResolver } from "../src/graphql/resolvers/inbox_human_questions.ts";

test("InboxHumanQuestionsQueryResolver returns the open human inbox questions for the company", async () => {
  const resolver = new InboxHumanQuestionsQueryResolver({
    async listOpenHumanQuestions(_transactionProvider: unknown, companyId: string) {
      assert.equal(companyId, "company-123");

      return [{
        agentId: "agent-1",
        agentName: "Ops Agent",
        allowCustomAnswer: true,
        answer: null,
        companyId: "company-123",
        createdAt: new Date("2026-03-31T20:00:00.000Z"),
        id: "inbox-1",
        kind: "human_question" as const,
        proposals: [{
          answerText: "Ship it tonight.",
          cons: ["Higher release risk"],
          createdAt: new Date("2026-03-31T20:00:00.000Z"),
          id: "proposal-1",
          inboxItemId: "inbox-1",
          pros: ["Fastest path"],
          rating: 4,
          sortOrder: 0,
        }],
        questionText: "Should I ship tonight or wait until tomorrow?",
        resolvedAt: null,
        resolvedByUserId: null,
        sessionId: "session-1",
        sessionTitle: "Backend release review",
        status: "open" as const,
        summary: "Should I ship tonight or wait until tomorrow?",
        title: "Choose release timing",
        toolCallId: "tool-call-1",
        updatedAt: new Date("2026-03-31T20:05:00.000Z"),
      }];
    },
  } as never);

  const result = await resolver.execute({}, {}, {
    app_runtime_transaction_provider: {} as never,
    authSession: {
      company: {
        id: "company-123",
        name: "Example Org",
      },
    },
  } as never);

  assert.deepEqual(result, [{
    agentId: "agent-1",
    agentName: "Ops Agent",
    allowCustomAnswer: true,
    answer: null,
    createdAt: "2026-03-31T20:00:00.000Z",
    id: "inbox-1",
    proposals: [{
      answerText: "Ship it tonight.",
      cons: ["Higher release risk"],
      id: "proposal-1",
      pros: ["Fastest path"],
      rating: 4,
    }],
    questionText: "Should I ship tonight or wait until tomorrow?",
    resolvedAt: null,
    resolvedByUserId: null,
    sessionId: "session-1",
    sessionTitle: "Backend release review",
    status: "open",
    summary: "Should I ship tonight or wait until tomorrow?",
    title: "Choose release timing",
    updatedAt: "2026-03-31T20:05:00.000Z",
  }]);
});
