import assert from "node:assert/strict";
import { test } from "vitest";
import { SessionQueuedMessagesQueryResolver } from "../src/graphql/resolvers/session_queued_messages.ts";
import { SessionTranscriptMessagesQueryResolver } from "../src/graphql/resolvers/session_transcript_messages.ts";

test("SessionQueuedMessagesQueryResolver checks session access before loading queued rows", async () => {
  const getSessionCalls: Array<{ companyId: string; sessionId: string; userId: string }> = [];
  const listQueuedCalls: Array<{ companyId: string; sessionId: string }> = [];
  const resolver = new SessionQueuedMessagesQueryResolver(
    undefined,
    {
      async listQueued(_transactionProvider: unknown, companyId: string, sessionId: string) {
        listQueuedCalls.push({
          companyId,
          sessionId,
        });

        return [{
          claimedAt: null,
          createdAt: new Date("2026-03-31T08:00:00.000Z"),
          dispatchedAt: null,
          id: "queued-1",
          images: [],
          sessionId,
          shouldSteer: false,
          status: "pending",
          text: "Focus on the flaky worker.",
          updatedAt: new Date("2026-03-31T08:01:00.000Z"),
        }];
      },
    } as never,
    {
      async getSession(_transactionProvider: unknown, companyId: string, sessionId: string, userId: string) {
        getSessionCalls.push({
          companyId,
          sessionId,
          userId,
        });

        return {
          id: sessionId,
        };
      },
    } as never,
  );

  const result = await resolver.execute(
    null,
    {
      sessionId: "session-1",
    },
    {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-123",
        },
        user: {
          id: "user-123",
        },
      },
    } as never,
  );

  assert.deepEqual(getSessionCalls, [{
    companyId: "company-123",
    sessionId: "session-1",
    userId: "user-123",
  }]);
  assert.deepEqual(listQueuedCalls, [{
    companyId: "company-123",
    sessionId: "session-1",
  }]);
  assert.deepEqual(result, [{
    claimedAt: null,
    createdAt: "2026-03-31T08:00:00.000Z",
    dispatchedAt: null,
    id: "queued-1",
    images: [],
    sessionId: "session-1",
    shouldSteer: false,
    status: "pending",
    text: "Focus on the flaky worker.",
    updatedAt: "2026-03-31T08:01:00.000Z",
  }]);
});

test("SessionTranscriptMessagesQueryResolver forwards the owning user to transcript reads", async () => {
  const listTranscriptCalls: Array<{
    after?: string | null;
    companyId: string;
    first: number;
    sessionId: string;
    userId: string;
  }> = [];
  const resolver = new SessionTranscriptMessagesQueryResolver({
    async listTranscriptMessages(
      _transactionProvider: unknown,
      companyId: string,
      sessionId: string,
      userId: string,
      first?: number | null,
      after?: string | null,
    ) {
      listTranscriptCalls.push({
        after,
        companyId,
        first: first ?? 0,
        sessionId,
        userId,
      });

      return {
        edges: [],
        pageInfo: {
          endCursor: null,
          hasNextPage: false,
        },
      };
    },
  } as never);

  const result = await resolver.execute(
    null,
    {
      after: "cursor-1",
      first: 25,
      sessionId: "session-1",
    },
    {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-123",
        },
        user: {
          id: "user-123",
        },
      },
    } as never,
  );

  assert.deepEqual(listTranscriptCalls, [{
    after: "cursor-1",
    companyId: "company-123",
    first: 25,
    sessionId: "session-1",
    userId: "user-123",
  }]);
  assert.deepEqual(result, {
    edges: [],
    pageInfo: {
      endCursor: null,
      hasNextPage: false,
    },
  });
});
