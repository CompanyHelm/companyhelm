import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { PiMonoSessionManagerService } from "../src/services/agent/session/pi-mono/session_manager_service.ts";
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
  const piCreateCalls: Array<{
    transactionProvider: unknown;
    sessionId: string;
    apiKey: string;
    providerId: string;
    modelId: string;
    reasoningLevel: string | null | undefined;
  }> = [];
  const piPromptCalls: Array<{ sessionId: string; message: string }> = [];
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
                }];
              },
            };
          },
        };
      }

      if (selectCallCount === 3) {
        return {
          from() {
            return {
              async where() {
                return [{
                  id: "credential-1",
                  modelProvider: "openai",
                  encryptedApiKey: "sk-openai",
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
                status: "running",
                createdAt: new Date("2026-03-25T01:00:00.000Z"),
                updatedAt: new Date("2026-03-25T01:00:00.000Z"),
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
      async create(
        transactionProvider: unknown,
        sessionId: string,
        apiKey: string,
        providerId: string,
        modelId: string,
        reasoningLevel?: string | null,
      ) {
        piCreateCalls.push({
          transactionProvider,
          sessionId,
          apiKey,
          providerId,
          modelId,
          reasoningLevel,
        });
        return {} as never;
      },
      async prompt(sessionId: string, message: string) {
        piPromptCalls.push({
          sessionId,
          message,
        });
      },
    } as PiMonoSessionManagerService,
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
  );
  const transactionProvider = SessionManagerServiceTestHarness.createTransactionProviderMock(transaction);

  const sessionId = await service.createSession(
    transactionProvider as never,
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
  assert.equal(insertedValues[0]?.status, "running");
  assert.deepEqual(piCreateCalls, [{
    sessionId: "session-1",
    transactionProvider,
    apiKey: "sk-openai",
    providerId: "openai",
    modelId: "gpt-5.4",
    reasoningLevel: "high",
  }]);
  assert.deepEqual(piPromptCalls, [{
    sessionId: "session-1",
    message: "Write the launch email.",
  }]);
  assert.deepEqual(publishCalls, [{
    channel: "company:company-1:session:session-1:update",
    message: "",
  }]);
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
  const piCreateCalls: Array<{
    transactionProvider: unknown;
    sessionId: string;
    apiKey: string;
    providerId: string;
    modelId: string;
    reasoningLevel: string | null | undefined;
  }> = [];
  const piPromptCalls: Array<{ sessionId: string; message: string }> = [];
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
                  id: "model-row-1",
                  modelId: "gpt-5.4",
                  modelProviderCredentialId: "credential-2",
                }];
              },
            };
          },
        };
      }

      if (selectCallCount === 3) {
        return {
          from() {
            return {
              async where() {
                return [{
                  id: "credential-2",
                  modelProvider: "openai-codex",
                  encryptedApiKey: "oauth-access-token",
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
                id: "session-2",
                agentId: "agent-1",
                currentModelId: "gpt-5.4-mini",
                currentReasoningLevel: "low",
                status: "running",
                createdAt: new Date("2026-03-25T02:00:00.000Z"),
                updatedAt: new Date("2026-03-25T02:00:00.000Z"),
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
      async create(
        transactionProvider: unknown,
        sessionId: string,
        apiKey: string,
        providerId: string,
        modelId: string,
        reasoningLevel?: string | null,
      ) {
        piCreateCalls.push({
          transactionProvider,
          sessionId,
          apiKey,
          providerId,
          modelId,
          reasoningLevel,
        });
        return {} as never;
      },
      async prompt(sessionId: string, message: string) {
        piPromptCalls.push({
          sessionId,
          message,
        });
      },
    } as PiMonoSessionManagerService,
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
  );

  const transactionProvider = SessionManagerServiceTestHarness.createTransactionProviderMock(transaction);
  const sessionId = await service.createSession(
    transactionProvider as never,
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
  assert.equal(insertedValues[0]?.status, "running");
  assert.deepEqual(piCreateCalls, [{
    sessionId: "session-2",
    transactionProvider,
    apiKey: "oauth-access-token",
    providerId: "openai-codex",
    modelId: "gpt-5.4-mini",
    reasoningLevel: "low",
  }]);
  assert.deepEqual(piPromptCalls, [{
    sessionId: "session-2",
    message: "Summarize the open issues.",
  }]);
  assert.deepEqual(publishCalls, [{
    channel: "company:company-1:session:session-2:update",
    message: "",
  }]);
  assert.equal(logs[0]?.payload?.modelId, "gpt-5.4-mini");
  assert.equal(logs[0]?.payload?.reasoningLevel, "low");
});

test("SessionManagerService archiveSession updates the session status", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const updatedValues: Array<Record<string, unknown>> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  const transaction = {
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
                    currentModelId: "gpt-5.4",
                    currentReasoningLevel: "high",
                    status: "archived",
                    createdAt: new Date("2026-03-25T01:00:00.000Z"),
                    updatedAt: new Date("2026-03-25T02:00:00.000Z"),
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
      async create() {
        throw new Error("Pi create should not be called while archiving.");
      },
    } as PiMonoSessionManagerService,
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

test("SessionManagerService prompt logs the session request", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const service = new SessionManagerService(
    SessionManagerServiceTestHarness.createLoggerMock(logs) as never,
    {
      async create() {
        throw new Error("Pi create should not be called while prompting.");
      },
    } as PiMonoSessionManagerService,
    {
      async getClient() {
        throw new Error("Redis publish should not be called while prompting.");
      },
    } as never,
  );

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
