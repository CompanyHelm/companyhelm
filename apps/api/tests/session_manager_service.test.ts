import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { SessionProcessPubSubNames } from "../src/services/agent/session/process/pub_sub_names.ts";
import { SessionManagerService } from "../src/services/agent/session/session_manager_service.ts";
import { SessionProcessQueueService } from "../src/services/agent/session/process/queue.ts";
import { SessionProcessQueuedNames } from "../src/services/agent/session/process/queued_names.ts";
import { SessionQueuedMessageService } from "../src/services/agent/session/process/queued_messages.ts";

class SessionManagerServiceTestHarness {
  static createLoggerMock(logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }>) {
    return {
      child(bindings: Record<string, unknown>) {
        return {
          info(payload: Record<string, unknown>, message: string) {
            logs.push({
              bindings,
              message,
              payload,
            });
          },
        };
      },
    };
  }

  static createTransactionProviderMock(transaction: unknown) {
    return {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback(transaction);
      },
    };
  }
}

test("SessionManagerService createSession persists a queued session, stores the first message, and enqueues a wake job", async () => {
  const userMessage = "Write the launch email and include rollout steps for the onboarding sequence.";
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const insertedValues: Array<Record<string, unknown>> = [];
  const queuedMessages: Array<Record<string, unknown>> = [];
  const wakeCalls: Array<{ companyId: string; sessionId: string }> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  let selectCallCount = 0;
  const transaction = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return {
          from() {
            return {
              async where() {
                return [{
                  id: "agent-1",
                  defaultModelProviderCredentialModelId: "model-row-1",
                  defaultReasoningLevel: "high",
                }];
              },
            };
          },
        };
      }

      if (selectCallCount === 2) {
        return {
          from() {
            return {
              async where() {
                return [{
                  id: "model-row-1",
                  modelId: "gpt-5.4",
                  modelProviderCredentialId: "credential-1",
                  reasoningLevels: ["low", "medium", "high", "xhigh"],
                }];
              },
            };
          },
        };
      }

      throw new Error("Unexpected select call.");
    },
    insert() {
      return {
        values(value: Record<string, unknown>) {
          insertedValues.push(value);
          return {
            async returning() {
              return [{
                id: "session-1",
                agentId: "agent-1",
                currentModelProviderCredentialModelId: "model-row-1",
                currentReasoningLevel: "high",
                inferredTitle: userMessage.slice(0, 50),
                status: "queued",
                createdAt: new Date("2026-03-25T01:00:00.000Z"),
                updatedAt: new Date("2026-03-25T01:00:00.000Z"),
                userSetTitle: null,
              }];
            },
          };
        },
      };
    },
  };
  const service = new SessionManagerService(
    SessionManagerServiceTestHarness.createLoggerMock(logs) as never,
    {
      async getClient() {
        return {
          async publish(channel: string, message: string) {
            publishCalls.push({
              channel,
              message,
            });
            return 1;
          },
        };
      },
    } as never,
    new SessionProcessPubSubNames(),
    {
      async enqueueSessionWake(companyId: string, sessionId: string) {
        wakeCalls.push({
          companyId,
          sessionId,
        });
      },
    } as SessionProcessQueueService,
    new SessionProcessQueuedNames(),
    {
      async enqueueInTransaction(_database: unknown, input: Record<string, unknown>) {
        queuedMessages.push(input);
        return {
          id: "queued-1",
        };
      },
    } as SessionQueuedMessageService,
  );

  const sessionRecord = await service.createSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "agent-1",
    userMessage,
  );

  assert.equal(sessionRecord.id, "session-1");
  assert.equal(sessionRecord.currentModelProviderCredentialModelId, "model-row-1");
  assert.equal(sessionRecord.currentModelId, "gpt-5.4");
  assert.equal(insertedValues.length, 1);
  assert.equal(insertedValues[0]?.companyId, "company-1");
  assert.equal(insertedValues[0]?.agentId, "agent-1");
  assert.equal(insertedValues[0]?.currentModelProviderCredentialModelId, "model-row-1");
  assert.equal(insertedValues[0]?.currentReasoningLevel, "high");
  assert.equal(insertedValues[0]?.inferredTitle, userMessage.slice(0, 50));
  assert.equal(insertedValues[0]?.status, "queued");
  assert.deepEqual(queuedMessages, [{
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: userMessage,
  }]);
  assert.deepEqual(publishCalls, [{
    channel: "company:company-1:session:session-1:update",
    message: "",
  }]);
  assert.deepEqual(wakeCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
  }]);
  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "created agent session",
    payload: {
      agentId: "agent-1",
      companyId: "company-1",
      modelId: "gpt-5.4",
      reasoningLevel: "high",
      sessionId: "session-1",
    },
  }]);
});

test("SessionManagerService createSession persists explicit model, reasoning, and session ids", async () => {
  const insertedValues: Array<Record<string, unknown>> = [];
  let selectCallCount = 0;
  const transaction = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return {
          from() {
            return {
              async where() {
                return [{
                  id: "agent-1",
                  defaultModelProviderCredentialModelId: "model-row-1",
                  defaultReasoningLevel: "medium",
                }];
              },
            };
          },
        };
      }

      if (selectCallCount === 2) {
        return {
          from() {
            return {
              async where() {
                return [{
                  id: "model-row-2",
                  modelId: "gpt-5.4-mini",
                  modelProviderCredentialId: "credential-2",
                  reasoningLevels: ["low", "medium"],
                }];
              },
            };
          },
        };
      }

      throw new Error("Unexpected select call.");
    },
    insert() {
      return {
        values(value: Record<string, unknown>) {
          insertedValues.push(value);
          return {
            async returning() {
                return [{
                  id: "session-client-1",
                  agentId: "agent-1",
                  currentModelProviderCredentialModelId: "model-row-2",
                  currentReasoningLevel: "low",
                  inferredTitle: "Summarize the open issues.",
                  status: "queued",
                createdAt: new Date("2026-03-25T02:00:00.000Z"),
                updatedAt: new Date("2026-03-25T02:00:00.000Z"),
                userSetTitle: null,
              }];
            },
          };
        },
      };
    },
  };
  const service = new SessionManagerService(
    SessionManagerServiceTestHarness.createLoggerMock([]) as never,
    {
      async getClient() {
        return {
          async publish() {
            return 1;
          },
        };
      },
    } as never,
    new SessionProcessPubSubNames(),
    {
      async enqueueSessionWake() {},
    } as SessionProcessQueueService,
    new SessionProcessQueuedNames(),
    {
      async enqueueInTransaction() {
        return {
          id: "queued-1",
        };
      },
    } as SessionQueuedMessageService,
  );

  await service.createSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "agent-1",
    "Summarize the open issues.",
    "model-row-2",
    "low",
    "session-client-1",
  );

  assert.equal(insertedValues[0]?.id, "session-client-1");
  assert.equal(insertedValues[0]?.currentModelProviderCredentialModelId, "model-row-2");
  assert.equal(insertedValues[0]?.currentReasoningLevel, "low");
});

test("SessionManagerService archiveSession updates the session status and publishes the session update", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const updatedValues: Array<Record<string, unknown>> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  let selectCallCount = 0;
  const transaction = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return {
          from() {
            return {
              async where() {
                return [{
                  id: "model-row-1",
                  modelId: "gpt-5.4",
                  modelProviderCredentialId: "credential-1",
                  reasoningLevels: ["low", "medium", "high"],
                }];
              },
            };
          },
        };
      }

      throw new Error("Unexpected select call.");
    },
    update() {
      return {
        set(value: Record<string, unknown>) {
          updatedValues.push(value);
          return {
            where() {
              return {
                async returning() {
                  return [{
                    id: "session-1",
                    agentId: "agent-1",
                    currentModelProviderCredentialModelId: "model-row-1",
                    currentReasoningLevel: "high",
                    inferredTitle: "Existing title",
                    status: "archived",
                    createdAt: new Date("2026-03-25T01:00:00.000Z"),
                    updatedAt: new Date("2026-03-25T02:00:00.000Z"),
                    userSetTitle: null,
                  }];
                },
              };
            },
          };
        },
      };
    },
  };
  const service = new SessionManagerService(
    SessionManagerServiceTestHarness.createLoggerMock(logs) as never,
    {
      async getClient() {
        return {
          async publish(channel: string, message: string) {
            publishCalls.push({
              channel,
              message,
            });
            return 1;
          },
        };
      },
    } as never,
    new SessionProcessPubSubNames(),
    {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not be touched while archiving.");
      },
    } as SessionProcessQueueService,
    new SessionProcessQueuedNames(),
    new SessionQueuedMessageService(),
  );

  const sessionRecord = await service.archiveSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
  );

  assert.equal(sessionRecord.status, "archived");
  assert.equal(updatedValues[0]?.status, "archived");
  assert.ok(updatedValues[0]?.updated_at instanceof Date);
  assert.deepEqual(publishCalls, [{
    channel: "company:company-1:session:session-1:update",
    message: "",
  }]);
  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "archived agent session",
    payload: {
      companyId: "company-1",
      sessionId: "session-1",
    },
  }]);
});

test("SessionManagerService prompt queues the message, publishes session updates, and nudges steering when requested", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const queuedMessages: Array<Record<string, unknown>> = [];
  const updatedValues: Array<Record<string, unknown>> = [];
  const wakeCalls: Array<{ companyId: string; sessionId: string }> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  let selectCallCount = 0;
  const transaction = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return {
          from() {
            return {
              async where() {
                return [{
                  agentId: "agent-1",
                  currentModelProviderCredentialModelId: "model-row-1",
                  currentReasoningLevel: "high",
                  id: "session-1",
                  status: "running",
                }];
              },
            };
          },
        };
      }

      if (selectCallCount === 2) {
        return {
          from() {
            return {
              async where() {
                return [{
                  id: "model-row-2",
                  modelId: "gpt-5.4-mini",
                  modelProviderCredentialId: "credential-2",
                  reasoningLevels: ["low", "medium"],
                }];
              },
            };
          },
        };
      }

      throw new Error("Unexpected select call.");
    },
    update() {
      return {
        set(value: Record<string, unknown>) {
          updatedValues.push(value);
          return {
            where() {
              return {
                async returning() {
                  return [{
                    id: "session-1",
                    agentId: "agent-1",
                    currentModelProviderCredentialModelId: "model-row-2",
                    currentReasoningLevel: "medium",
                    inferredTitle: "Existing title",
                    status: "running",
                    createdAt: new Date("2026-03-25T01:00:00.000Z"),
                    updatedAt: new Date("2026-03-25T03:00:00.000Z"),
                    userSetTitle: null,
                  }];
                },
              };
            },
          };
        },
      };
    },
  };
  const service = new SessionManagerService(
    SessionManagerServiceTestHarness.createLoggerMock(logs) as never,
    {
      async getClient() {
        return {
          async publish(channel: string, message: string) {
            publishCalls.push({
              channel,
              message,
            });
            return 1;
          },
        };
      },
    } as never,
    new SessionProcessPubSubNames(),
    {
      async enqueueSessionWake(companyId: string, sessionId: string) {
        wakeCalls.push({
          companyId,
          sessionId,
        });
      },
    } as SessionProcessQueueService,
    new SessionProcessQueuedNames(),
    {
      async enqueueInTransaction(_database: unknown, input: Record<string, unknown>) {
        queuedMessages.push(input);
        return {
          id: "queued-2",
        };
      },
    } as SessionQueuedMessageService,
  );

  const sessionRecord = await service.prompt(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
    "Focus on the failed deploy.",
    "model-row-2",
    "medium",
    true,
  );

  assert.equal(sessionRecord.id, "session-1");
  assert.equal(sessionRecord.currentModelProviderCredentialModelId, "model-row-2");
  assert.equal(sessionRecord.currentModelId, "gpt-5.4-mini");
  assert.equal(updatedValues[0]?.currentModelProviderCredentialModelId, "model-row-2");
  assert.equal(updatedValues[0]?.currentReasoningLevel, "medium");
  assert.equal(updatedValues[0]?.status, "running");
  assert.deepEqual(queuedMessages, [{
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: true,
    text: "Focus on the failed deploy.",
  }]);
  assert.deepEqual(wakeCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
  }]);
  assert.deepEqual(publishCalls, [
    {
      channel: "company:company-1:session:session-1:update",
      message: "",
    },
    {
      channel: "company:company-1:session:session-1:steer",
      message: "",
    },
  ]);
  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "queued session prompt",
    payload: {
      companyId: "company-1",
      modelId: "gpt-5.4-mini",
      reasoningLevel: "medium",
      sessionId: "session-1",
      shouldSteer: true,
    },
  }]);
});
