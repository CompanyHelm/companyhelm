import assert from "node:assert/strict";
import { test } from "vitest";
import { UnarchiveSessionMutation } from "../src/graphql/mutations/unarchive_session.ts";

test("UnarchiveSessionMutation restores the archived session and returns the refreshed session record", async () => {
  const mutation = new UnarchiveSessionMutation(
    {
      async unarchiveSession(transactionProvider: unknown, companyId: string, sessionId: string, userId: string) {
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
          associatedTask: null,
          currentContextTokens: 1024,
          forkedFromSessionAgentId: null,
          forkedFromSessionId: null,
          forkedFromSessionTitle: null,
          forkedFromTurnId: null,
          hasUnread: false,
          lastUserMessageAt: "2026-04-12T12:00:00.000Z",
          modelProviderCredentialModelId: "model-row-1",
          modelId: "gpt-5.4",
          reasoningLevel: "high",
          inferredTitle: "Review deployment checklist",
          isCompacting: false,
          isThinking: false,
          maxContextTokens: 128000,
          status: "stopped",
          thinkingText: null,
          createdAt: "2026-04-12T11:00:00.000Z",
          updatedAt: "2026-04-12T12:05:00.000Z",
          userSetTitle: null,
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
    associatedTask: null,
    currentContextTokens: 1024,
    forkedFromSessionAgentId: null,
    forkedFromSessionId: null,
    forkedFromSessionTitle: null,
    forkedFromTurnId: null,
    hasUnread: false,
    lastUserMessageAt: "2026-04-12T12:00:00.000Z",
    modelProviderCredentialModelId: "model-row-1",
    modelId: "gpt-5.4",
    reasoningLevel: "high",
    inferredTitle: "Review deployment checklist",
    isCompacting: false,
    isThinking: false,
    maxContextTokens: 128000,
    status: "stopped",
    thinkingText: null,
    createdAt: "2026-04-12T11:00:00.000Z",
    updatedAt: "2026-04-12T12:05:00.000Z",
    userSetTitle: null,
  });
});
