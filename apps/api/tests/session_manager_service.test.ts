import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { SessionManagerService } from "../src/services/agent/session/session_manager_service.ts";

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

test("SessionManagerService createSession falls back to the agent defaults and logs creation", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
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
                currentModelId: "gpt-5.4",
                currentReasoningLevel: "high",
                userMessage: "Write the launch email.",
                createdAt: new Date("2026-03-25T01:00:00.000Z"),
                updatedAt: new Date("2026-03-25T01:00:00.000Z"),
              }];
            },
          };
        },
      };
    },
  };
  const service = new SessionManagerService(SessionManagerServiceTestHarness.createLoggerMock(logs) as never);

  const sessionId = await service.createSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "agent-1",
    "Write the launch email.",
  );

  assert.equal(sessionId.id, "session-1");
  assert.equal(insertedValues.length, 1);
  assert.equal(insertedValues[0]?.companyId, "company-1");
  assert.equal(insertedValues[0]?.agentId, "agent-1");
  assert.equal(insertedValues[0]?.currentModelId, "gpt-5.4");
  assert.equal(insertedValues[0]?.currentReasoningLevel, "high");
  assert.equal(insertedValues[0]?.isRunning, false);
  assert.equal(insertedValues[0]?.user_message, "Write the launch email.");
  assert.equal(logs.length, 1);
  assert.deepEqual(logs[0], {
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
  });
});

test("SessionManagerService createSession prefers explicit model and reasoning values", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const insertedValues: Array<Record<string, unknown>> = [];
  const transaction = {
    select() {
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
    },
    insert() {
      return {
        values(value: Record<string, unknown>) {
          insertedValues.push(value);
          return {
            async returning() {
              return [{
                id: "session-2",
                agentId: "agent-1",
                currentModelId: "gpt-5.4-mini",
                currentReasoningLevel: "low",
                userMessage: "Summarize the open issues.",
                createdAt: new Date("2026-03-25T02:00:00.000Z"),
                updatedAt: new Date("2026-03-25T02:00:00.000Z"),
              }];
            },
          };
        },
      };
    },
  };
  const service = new SessionManagerService(SessionManagerServiceTestHarness.createLoggerMock(logs) as never);

  const sessionId = await service.createSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "agent-1",
    "Summarize the open issues.",
    "gpt-5.4-mini",
    "low",
  );

  assert.equal(sessionId.id, "session-2");
  assert.equal(insertedValues.length, 1);
  assert.equal(insertedValues[0]?.currentModelId, "gpt-5.4-mini");
  assert.equal(insertedValues[0]?.currentReasoningLevel, "low");
  assert.equal(insertedValues[0]?.isRunning, false);
  assert.equal(insertedValues[0]?.user_message, "Summarize the open issues.");
  assert.equal(logs[0]?.payload?.modelId, "gpt-5.4-mini");
  assert.equal(logs[0]?.payload?.reasoningLevel, "low");
});

test("SessionManagerService prompt logs the session request", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const service = new SessionManagerService(SessionManagerServiceTestHarness.createLoggerMock(logs) as never);

  await service.prompt(
    SessionManagerServiceTestHarness.createTransactionProviderMock({}) as never,
    "company-1",
    "session-1",
  );

  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "prompt requested for agent session",
    payload: {
      companyId: "company-1",
      sessionId: "session-1",
    },
  }]);
});
