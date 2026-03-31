import assert from "node:assert/strict";
import { test } from "vitest";
import { ResolveInboxHumanQuestionMutation } from "../src/graphql/mutations/resolve_inbox_human_question.ts";

test("ResolveInboxHumanQuestionMutation resolves the inbox item and returns the steered answer", async () => {
  const mutation = new ResolveInboxHumanQuestionMutation({
    async resolveHumanQuestion(_transactionProvider: unknown, input: {
      companyId: string;
      customAnswerText?: string | null;
      inboxItemId: string;
      proposalId?: string | null;
      userId: string;
    }) {
      assert.deepEqual(input, {
        companyId: "company-123",
        customAnswerText: null,
        inboxItemId: "inbox-1",
        proposalId: "proposal-2",
        userId: "user-123",
      });

      return {
        agentId: "agent-1",
        agentName: "Ops Agent",
        allowCustomAnswer: true,
        answer: {
          answeredByUserId: "user-123",
          createdAt: new Date("2026-03-31T20:10:00.000Z"),
          customAnswerText: null,
          finalAnswerText: "Wait until tomorrow morning.",
          id: "answer-1",
          inboxItemId: "inbox-1",
          selectedProposalId: "proposal-2",
        },
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
      customAnswerText: null,
      inboxItemId: "inbox-1",
      proposalId: "proposal-2",
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
    answer: {
      answeredByUserId: "user-123",
      createdAt: "2026-03-31T20:10:00.000Z",
      customAnswerText: null,
      finalAnswerText: "Wait until tomorrow morning.",
      id: "answer-1",
      selectedProposalId: "proposal-2",
    },
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
