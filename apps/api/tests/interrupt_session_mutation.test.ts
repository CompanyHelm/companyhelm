import assert from "node:assert/strict";
import { test } from "vitest";
import { InterruptSessionMutation } from "../src/graphql/mutations/interrupt_session.ts";

test("InterruptSessionMutation interrupts the session and returns the current session record", async () => {
  const mutation = new InterruptSessionMutation(
    {
      async interruptSession(transactionProvider: unknown, companyId: string, sessionId: string) {
        assert.ok(transactionProvider);
        assert.equal(companyId, "company-123");
        assert.equal(sessionId, "session-1");
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
          currentContextTokens: 512,
          hasUnread: false,
          modelProviderCredentialModelId: "model-row-1",
          modelId: "gpt-5.4",
          reasoningLevel: "high",
          inferredTitle: "Investigate deploy timeout",
          isCompacting: false,
          isThinking: true,
          maxContextTokens: 128000,
          status: "running",
          thinkingText: "Stopping current work…",
          createdAt: "2026-04-04T20:00:00.000Z",
          updatedAt: "2026-04-04T20:05:00.000Z",
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
    currentContextTokens: 512,
    hasUnread: false,
    modelProviderCredentialModelId: "model-row-1",
    modelId: "gpt-5.4",
    reasoningLevel: "high",
    inferredTitle: "Investigate deploy timeout",
    isCompacting: false,
    isThinking: true,
    maxContextTokens: 128000,
    status: "running",
    thinkingText: "Stopping current work…",
    createdAt: "2026-04-04T20:00:00.000Z",
    updatedAt: "2026-04-04T20:05:00.000Z",
    userSetTitle: null,
  });
});
