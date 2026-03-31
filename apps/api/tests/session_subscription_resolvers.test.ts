import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { SessionMessageUpdatedSubscriptionResolver } from "../src/graphql/resolvers/session_message_updated.ts";
import { SessionQueuedMessagesUpdatedSubscriptionResolver } from "../src/graphql/resolvers/session_queued_messages_updated.ts";
import { SessionUpdatedSubscriptionResolver } from "../src/graphql/resolvers/session_updated.ts";

async function waitForListener(
  getListener: () => ((message: string, channel: string) => void) | undefined,
): Promise<(message: string, channel: string) => void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const listener = getListener();
    if (listener) {
      return listener;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  throw new Error("Listener was not registered.");
}

test("SessionUpdated subscription reloads the full session from Postgres when Redis signals an update", async () => {
  const unsubscribe = vi.fn(async () => undefined);
  const subscribePattern = vi.fn(async (_pattern: string, listener: (message: string, channel: string) => void) => {
    subscribePattern.listener = listener;
    return {
      unsubscribe,
    };
  }) as typeof vi.fn & { listener?: (message: string, channel: string) => void };
  const sessionReadService = {
    getSession: vi.fn(async () => ({
      id: "session-1",
      agentId: "agent-1",
      currentContextTokens: 160000,
      hasUnread: true,
      isCompacting: false,
      modelId: "gpt-5.4",
      maxContextTokens: 200000,
      reasoningLevel: "high",
      isThinking: true,
      status: "running",
      thinkingText: "Checking repo state",
      createdAt: "2026-03-26T06:00:00.000Z",
      updatedAt: "2026-03-26T06:01:00.000Z",
    })),
  };
  const resolver = new SessionUpdatedSubscriptionResolver(sessionReadService as never);
  const context = {
    authSession: {
      company: {
        id: "company-1",
      },
      user: {
        id: "user-1",
      },
    },
    app_runtime_transaction_provider: {
      transaction: vi.fn(),
    },
    redisCompanyScopedService: {
      subscribePattern,
    },
  };

  const iterator = resolver.subscribe({}, {}, context as never);
  const nextEventPromise = iterator.next();
  await Promise.resolve();
  subscribePattern.listener?.("", "company:company-1:session:session-1:update");
  const nextEvent = await nextEventPromise;

  assert.deepEqual(nextEvent.value, {
    SessionUpdated: {
      id: "session-1",
      agentId: "agent-1",
      currentContextTokens: 160000,
      hasUnread: true,
      isCompacting: false,
      modelId: "gpt-5.4",
      maxContextTokens: 200000,
      reasoningLevel: "high",
      isThinking: true,
      status: "running",
      thinkingText: "Checking repo state",
      createdAt: "2026-03-26T06:00:00.000Z",
      updatedAt: "2026-03-26T06:01:00.000Z",
    },
  });
  assert.equal(subscribePattern.mock.calls[0]?.[0], "session:*:update");
  assert.deepEqual(sessionReadService.getSession.mock.calls[0], [
    context.app_runtime_transaction_provider,
    "company-1",
    "session-1",
    "user-1",
  ]);

  await iterator.return();
  assert.equal(unsubscribe.mock.calls.length, 1);
});

test("SessionUpdated subscription still works when Mercurius calls subscribe without a bound this", async () => {
  const unsubscribe = vi.fn(async () => undefined);
  const subscribePattern = vi.fn(async (_pattern: string, listener: (message: string, channel: string) => void) => {
    subscribePattern.listener = listener;
    return {
      unsubscribe,
    };
  }) as typeof vi.fn & { listener?: (message: string, channel: string) => void };
  const sessionReadService = {
    getSession: vi.fn(async () => ({
      id: "session-1",
      agentId: "agent-1",
      currentContextTokens: null,
      hasUnread: false,
      isCompacting: false,
      modelId: "gpt-5.4",
      maxContextTokens: 200000,
      reasoningLevel: "high",
      isThinking: false,
      status: "running",
      thinkingText: null,
      createdAt: "2026-03-26T06:00:00.000Z",
      updatedAt: "2026-03-26T06:01:00.000Z",
    })),
  };
  const resolver = new SessionUpdatedSubscriptionResolver(sessionReadService as never);
  const detachedSubscribe = resolver.subscribe;
  const context = {
    resolveSubscriptionContext: vi.fn(async () => ({
      authSession: {
        company: {
          id: "company-1",
        },
        user: {
          id: "user-1",
        },
      },
      app_runtime_transaction_provider: {
        transaction: vi.fn(),
      },
      redisCompanyScopedService: {
        subscribePattern,
      },
    })),
  };

  const iterator = detachedSubscribe({}, {}, context as never);
  const nextEventPromise = iterator.next();
  const listener = await waitForListener(() => subscribePattern.listener);
  listener("", "company:company-1:session:session-1:update");
  const nextEvent = await nextEventPromise;

  assert.equal(nextEvent.value?.SessionUpdated.id, "session-1");
  assert.equal(context.resolveSubscriptionContext.mock.calls.length, 1);

  await iterator.return();
});

test("SessionMessageUpdated subscription reloads the message row from Postgres for the selected session", async () => {
  const unsubscribe = vi.fn(async () => undefined);
  const subscribePattern = vi.fn(async (_pattern: string, listener: (message: string, channel: string) => void) => {
    subscribePattern.listener = listener;
    return {
      unsubscribe,
    };
  }) as typeof vi.fn & { listener?: (message: string, channel: string) => void };
  const sessionReadService = {
    getMessage: vi.fn(async () => ({
      id: "message-1",
      sessionId: "session-123",
      turnId: "turn-1",
      role: "assistant",
      status: "completed",
      toolCallId: null,
      toolName: null,
      contents: [
        {
          type: "text",
          text: "Done",
          data: null,
          mimeType: null,
          structuredContent: null,
          toolCallId: null,
          toolName: null,
        },
      ],
      text: "Done",
      isError: false,
      createdAt: "2026-03-26T06:02:00.000Z",
      updatedAt: "2026-03-26T06:03:00.000Z",
    })),
  };
  const resolver = new SessionMessageUpdatedSubscriptionResolver(sessionReadService as never);
  const context = {
    authSession: {
      company: {
        id: "company-1",
      },
    },
    app_runtime_transaction_provider: {
      transaction: vi.fn(),
    },
    redisCompanyScopedService: {
      subscribePattern,
    },
  };

  const iterator = resolver.subscribe({}, { sessionId: "session-123" }, context as never);
  const nextEventPromise = iterator.next();
  await Promise.resolve();
  subscribePattern.listener?.("", "company:company-1:session:session-123:message:message-1:update");
  const nextEvent = await nextEventPromise;

  assert.deepEqual(nextEvent.value, {
    SessionMessageUpdated: {
      id: "message-1",
      sessionId: "session-123",
      turnId: "turn-1",
      role: "assistant",
      status: "completed",
      toolCallId: null,
      toolName: null,
      contents: [
        {
          type: "text",
          text: "Done",
          data: null,
          mimeType: null,
          structuredContent: null,
          toolCallId: null,
          toolName: null,
        },
      ],
      text: "Done",
      isError: false,
      createdAt: "2026-03-26T06:02:00.000Z",
      updatedAt: "2026-03-26T06:03:00.000Z",
    },
  });
  assert.equal(subscribePattern.mock.calls[0]?.[0], "session:session-123:message:*:update");
  assert.deepEqual(sessionReadService.getMessage.mock.calls[0], [
    context.app_runtime_transaction_provider,
    "company-1",
    "message-1",
  ]);

  await iterator.return();
  assert.equal(unsubscribe.mock.calls.length, 1);
});

test("SessionQueuedMessagesUpdated subscription reloads the full pending queue for the selected session", async () => {
  const unsubscribe = vi.fn(async () => undefined);
  const subscribePattern = vi.fn(async (_pattern: string, listener: (message: string, channel: string) => void) => {
    subscribePattern.listener = listener;
    return {
      unsubscribe,
    };
  }) as typeof vi.fn & { listener?: (message: string, channel: string) => void };
  const sessionQueuedMessageService = {
    listPending: vi.fn(async () => ([{
      createdAt: new Date("2026-03-31T09:00:00.000Z"),
      id: "queued-1",
      images: [],
      sessionId: "session-123",
      shouldSteer: false,
      status: "pending",
      text: "Focus on the flaky worker.",
      updatedAt: new Date("2026-03-31T09:01:00.000Z"),
    }])),
  };
  const resolver = new SessionQueuedMessagesUpdatedSubscriptionResolver(
    undefined,
    undefined,
    sessionQueuedMessageService as never,
  );
  const context = {
    authSession: {
      company: {
        id: "company-1",
      },
    },
    app_runtime_transaction_provider: {
      transaction: vi.fn(),
    },
    redisCompanyScopedService: {
      subscribePattern,
    },
  };

  const iterator = resolver.subscribe({}, { sessionId: "session-123" }, context as never);
  const nextEventPromise = iterator.next();
  await Promise.resolve();
  subscribePattern.listener?.("", "company:company-1:session:session-123:queued:update");
  const nextEvent = await nextEventPromise;

  assert.deepEqual(nextEvent.value, {
    SessionQueuedMessagesUpdated: [{
      createdAt: "2026-03-31T09:00:00.000Z",
      id: "queued-1",
      sessionId: "session-123",
      shouldSteer: false,
      status: "pending",
      text: "Focus on the flaky worker.",
      updatedAt: "2026-03-31T09:01:00.000Z",
    }],
  });
  assert.equal(subscribePattern.mock.calls[0]?.[0], "session:session-123:queued:update");
  assert.deepEqual(sessionQueuedMessageService.listPending.mock.calls[0], [
    context.app_runtime_transaction_provider,
    "company-1",
    "session-123",
  ]);

  await iterator.return();
  assert.equal(unsubscribe.mock.calls.length, 1);
});
