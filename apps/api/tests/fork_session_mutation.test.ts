import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { ForkSessionMutation } from "../src/graphql/mutations/fork_session.ts";

test("ForkSessionMutation delegates to SessionManagerService and serializes the forked session", async () => {
  const mutation = new ForkSessionMutation(
    {
      async forkSession(
        transactionProvider: unknown,
        companyId: string,
        sessionId: string,
        turnId: string,
        userId?: string | null,
      ) {
        assert.ok(transactionProvider);
        assert.equal(companyId, "company-1");
        assert.equal(sessionId, "session-1");
        assert.equal(turnId, "turn-1");
        assert.equal(userId, "user-1");

        return {
          id: "session-2",
          agentId: "agent-1",
          currentContextTokens: 4096,
          currentModelId: "gpt-5.4",
          currentModelProviderCredentialModelId: "model-row-1",
          currentReasoningLevel: "high",
          inferredTitle: "Fork of Review the release plan",
          isCompacting: false,
          isThinking: false,
          maxContextTokens: 200000,
          status: "stopped",
          thinkingText: null,
          createdAt: new Date("2026-04-07T20:00:00.000Z"),
          updatedAt: new Date("2026-04-07T20:00:00.000Z"),
          userSetTitle: null,
        };
      },
    } as never,
    {
      async getSession(transactionProvider: unknown, companyId: string, sessionId: string, userId: string) {
        assert.ok(transactionProvider);
        assert.equal(companyId, "company-1");
        assert.equal(sessionId, "session-2");
        assert.equal(userId, "user-1");

        return {
          id: "session-2",
          agentId: "agent-1",
          currentContextTokens: 4096,
          forkedFromSessionAgentId: "agent-1",
          forkedFromSessionId: "session-1",
          forkedFromSessionTitle: "Review the release plan",
          forkedFromTurnId: "turn-1",
          hasUnread: false,
          modelProviderCredentialModelId: "model-row-1",
          modelId: "gpt-5.4",
          reasoningLevel: "high",
          inferredTitle: "Fork of Review the release plan",
          isCompacting: false,
          isThinking: false,
          maxContextTokens: 200000,
          status: "stopped",
          thinkingText: null,
          createdAt: "2026-04-07T20:00:00.000Z",
          updatedAt: "2026-04-07T20:00:00.000Z",
          userSetTitle: null,
        };
      },
    } as never,
  );

  const result = await mutation.execute(
    null,
    {
      input: {
        sessionId: "session-1",
        turnId: "turn-1",
      },
    },
    {
      app_runtime_transaction_provider: {},
      authSession: {
        company: {
          id: "company-1",
        },
        user: {
          id: "user-1",
        },
      },
    } as never,
  );

  assert.deepEqual(result, {
    id: "session-2",
    agentId: "agent-1",
    currentContextTokens: 4096,
    forkedFromSessionAgentId: "agent-1",
    forkedFromSessionId: "session-1",
    forkedFromSessionTitle: "Review the release plan",
    forkedFromTurnId: "turn-1",
    hasUnread: false,
    modelProviderCredentialModelId: "model-row-1",
    modelId: "gpt-5.4",
    reasoningLevel: "high",
    inferredTitle: "Fork of Review the release plan",
    isCompacting: false,
    isThinking: false,
    maxContextTokens: 200000,
    status: "stopped",
    thinkingText: null,
    createdAt: "2026-04-07T20:00:00.000Z",
    updatedAt: "2026-04-07T20:00:00.000Z",
    userSetTitle: null,
  });
});
