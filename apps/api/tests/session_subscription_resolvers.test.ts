import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { SessionMessageUpdatedSubscriptionResolver } from "../src/graphql/resolvers/session_message_updated.ts";
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
      modelId: "gpt-5.4",
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
      modelId: "gpt-5.4",
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
      modelId: "gpt-5.4",
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
      role: "assistant",
      status: "completed",
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
      role: "assistant",
      status: "completed",
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
