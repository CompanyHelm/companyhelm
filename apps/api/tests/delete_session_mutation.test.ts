import assert from "node:assert/strict";
import { test } from "vitest";
import { DeleteSessionMutation } from "../src/graphql/mutations/delete_session.ts";

test("DeleteSessionMutation deletes the archived session and returns the deleted snapshot", async () => {
  const mutation = new DeleteSessionMutation(
    {
      async deleteSession(transactionProvider: unknown, companyId: string, sessionId: string, userId: string) {
        assert.ok(transactionProvider);
        assert.equal(companyId, "company-123");
        assert.equal(sessionId, "session-1");
        assert.equal(userId, "user-123");
      },
    } as never,
    {
      async getSession(transactionProvider: unknown, companyId: string, sessionId: string, userId: string) {
        assert.ok(transactionProvider);
        assert.equal(companyId, "company-123");
        assert.equal(sessionId, "session-1");
        assert.equal(userId, "user-123");

        return {
          id: "session-1",
          agentId: "agent-1",
          associatedTask: {
            id: "task-1",
            name: "Ship launch checklist",
            status: "completed",
          },
          currentContextTokens: 2048,
          forkedFromSessionAgentId: null,
          forkedFromSessionId: null,
          forkedFromSessionTitle: null,
          forkedFromTurnId: null,
          hasUnread: false,
          lastUserMessageAt: "2026-04-11T08:00:00.000Z",
          modelProviderCredentialModelId: "model-row-1",
          modelId: "gpt-5.4",
          reasoningLevel: "high",
          inferredTitle: "Ship launch checklist",
          isCompacting: false,
          isThinking: false,
          maxContextTokens: 128000,
          status: "archived",
          thinkingText: null,
          createdAt: "2026-04-11T07:00:00.000Z",
          updatedAt: "2026-04-11T08:05:00.000Z",
          userSetTitle: "Launch checklist",
        };
      },
    } as never,
  );

  const result = await mutation.execute({}, {
    input: {
      sessionId: "session-1",
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
    id: "session-1",
    agentId: "agent-1",
    associatedTask: {
      id: "task-1",
      name: "Ship launch checklist",
      status: "completed",
    },
    currentContextTokens: 2048,
    forkedFromSessionAgentId: null,
    forkedFromSessionId: null,
    forkedFromSessionTitle: null,
    forkedFromTurnId: null,
    hasUnread: false,
    lastUserMessageAt: "2026-04-11T08:00:00.000Z",
    modelProviderCredentialModelId: "model-row-1",
    modelId: "gpt-5.4",
    reasoningLevel: "high",
    inferredTitle: "Ship launch checklist",
    isCompacting: false,
    isThinking: false,
    maxContextTokens: 128000,
    status: "archived",
    thinkingText: null,
    createdAt: "2026-04-11T07:00:00.000Z",
    updatedAt: "2026-04-11T08:05:00.000Z",
    userSetTitle: "Launch checklist",
  });
});
