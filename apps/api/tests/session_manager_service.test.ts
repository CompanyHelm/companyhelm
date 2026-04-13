import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { SessionContextCheckpointService } from "../src/services/agent/session/context_checkpoint_service.ts";
import { SessionLifecycleService } from "../src/services/agent/session/session_lifecycle_service.ts";
import { SessionProcessPubSubNames } from "../src/services/agent/session/process/pub_sub_names.ts";
import { SessionManagerService } from "../src/services/agent/session/session_manager_service.ts";
import { SessionModelSelectionService } from "../src/services/agent/session/session_model_selection_service.ts";
import { SessionProcessQueuedNames } from "../src/services/agent/session/process/queued_names.ts";
import { SessionPromptService } from "../src/services/agent/session/session_prompt_service.ts";
import { SessionSecretCopyService } from "../src/services/agent/session/session_secret_copy_service.ts";

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

  static createService(input: {
    logs?: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }>;
    redisService?: unknown;
    sessionContextCheckpointService?: unknown;
    sessionProcessPubSubNames?: SessionProcessPubSubNames;
    sessionProcessQueueService?: unknown;
    sessionProcessQueuedNames?: SessionProcessQueuedNames;
    sessionQueuedMessageService?: unknown;
  }): SessionManagerService {
    const sessionModelSelectionService = new SessionModelSelectionService();
    const sessionProcessPubSubNames = input.sessionProcessPubSubNames ?? new SessionProcessPubSubNames();
    const sessionProcessQueuedNames = input.sessionProcessQueuedNames ?? new SessionProcessQueuedNames();
    const sessionPromptService = new SessionPromptService(
      (input.redisService ?? {
        async getClient() {
          return {
            async publish() {
              return 1;
            },
          };
        },
      }) as never,
      sessionModelSelectionService,
      sessionProcessPubSubNames,
      (input.sessionProcessQueueService ?? {
        async enqueueSessionWake() {
          return undefined;
        },
      }) as never,
      sessionProcessQueuedNames,
      (input.sessionQueuedMessageService ?? {
        async deleteAllForSessionInTransaction() {
          return undefined;
        },
        async deletePendingUserMessage() {
          throw new Error("deletePendingUserMessage was not expected in this test.");
        },
        async enqueueInTransaction() {
          return {
            id: "queued-default",
          };
        },
        async markSteer() {
          throw new Error("markSteer was not expected in this test.");
        },
      }) as never,
    );
    const sessionLifecycleService = new SessionLifecycleService(
      (input.redisService ?? {
        async getClient() {
          return {
            async publish() {
              return 1;
            },
          };
        },
      }) as never,
      sessionModelSelectionService,
      sessionPromptService,
      new SessionSecretCopyService(),
      (input.sessionContextCheckpointService as SessionContextCheckpointService | undefined) ?? new SessionContextCheckpointService(),
      sessionProcessPubSubNames,
      sessionProcessQueuedNames,
    );

    return new SessionManagerService(
      SessionManagerServiceTestHarness.createLoggerMock(input.logs ?? []) as never,
      sessionLifecycleService,
      sessionPromptService,
    );
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

      if (selectCallCount === 3) {
        return {
          from() {
            return {
              async where() {
                return [];
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
  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake(companyId: string, sessionId: string) {
        wakeCalls.push({
          companyId,
          sessionId,
        });
      },
    },
    sessionQueuedMessageService: {
      async enqueueInTransaction(_database: unknown, input: Record<string, unknown>) {
        queuedMessages.push(input);
        return {
          id: "queued-1",
        };
      },
    },
  });

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
  assert.equal(insertedValues[0]?.ownerUserId, null);
  assert.equal(insertedValues[0]?.status, "queued");
  assert.deepEqual(queuedMessages, [{
    companyId: "company-1",
    images: [],
    sessionId: "session-1",
    shouldSteer: false,
    text: userMessage,
  }]);
  assert.deepEqual(publishCalls, [
    {
      channel: "company:company-1:session:session-1:queued:update",
      message: "",
    },
    {
      channel: "company:company-1:session:session-1:update",
      message: "",
    },
  ]);
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

test("SessionManagerService createSession infers an image title when the first prompt only contains attachments", async () => {
  const insertedValues: Array<Record<string, unknown>> = [];
  const queuedMessages: Array<Record<string, unknown>> = [];
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
                  reasoningLevels: ["low", "medium", "high"],
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
                return [];
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
                inferredTitle: "Shared image",
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
  const service = SessionManagerServiceTestHarness.createService({
    sessionQueuedMessageService: {
      async enqueueInTransaction(_database: unknown, input: Record<string, unknown>) {
        queuedMessages.push(input);
        return {
          id: "queued-1",
        };
      },
    },
  });

  const sessionRecord = await service.createSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "agent-1",
    "",
    undefined,
    undefined,
    undefined,
    undefined,
    [{
      base64EncodedImage: "encoded-image",
      mimeType: "image/png",
    }],
  );

  assert.equal(sessionRecord.inferredTitle, "Shared image");
  assert.equal(insertedValues[0]?.inferredTitle, "Shared image");
  assert.deepEqual(queuedMessages, [{
    companyId: "company-1",
    images: [{
      base64EncodedImage: "encoded-image",
      mimeType: "image/png",
    }],
    sessionId: "session-1",
    shouldSteer: false,
    text: "",
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

      if (selectCallCount === 3) {
        return {
          from() {
            return {
              async where() {
                return [];
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
  const service = SessionManagerServiceTestHarness.createService({
    sessionProcessQueueService: {
      async enqueueSessionWake() {},
    },
    sessionQueuedMessageService: {
      async enqueueInTransaction() {
        return {
          id: "queued-1",
        };
      },
    },
  });

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

test("SessionManagerService createSession copies agent default secrets into the new session", async () => {
  const insertedValues: Array<Record<string, unknown> | Record<string, unknown>[]> = [];
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
                  modelProviderCredentialId: "credential-1",
                  reasoningLevels: ["low", "medium", "high"],
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
                  createdByUserId: "user-agent-defaults",
                  secretId: "secret-1",
                }, {
                  createdByUserId: null,
                  secretId: "secret-2",
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
        values(value: Record<string, unknown> | Record<string, unknown>[]) {
          insertedValues.push(value);
          return {
            async returning() {
              if (Array.isArray(value)) {
                return [];
              }

              return [{
                id: "session-1",
                agentId: "agent-1",
                currentModelProviderCredentialModelId: "model-row-1",
                currentReasoningLevel: "medium",
                inferredTitle: "Open the repository board.",
                status: "queued",
                createdAt: new Date("2026-03-25T03:00:00.000Z"),
                updatedAt: new Date("2026-03-25T03:00:00.000Z"),
                userSetTitle: null,
              }];
            },
          };
        },
      };
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    sessionProcessQueueService: {
      async enqueueSessionWake() {},
    },
    sessionQueuedMessageService: {
      async enqueueInTransaction() {
        return {
          id: "queued-1",
        };
      },
    },
  });

  await service.createSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "agent-1",
    "Open the repository board.",
    undefined,
    undefined,
    undefined,
    "user-session-creator",
  );

  assert.equal(insertedValues.length, 2);
  const createdSessionValues = Array.isArray(insertedValues[0]) ? null : insertedValues[0];
  assert.equal(createdSessionValues?.ownerUserId, "user-session-creator");
  const copiedSecretValues = insertedValues[1];
  assert.ok(Array.isArray(copiedSecretValues));
  assert.deepEqual(copiedSecretValues, [{
    companyId: "company-1",
    createdAt: copiedSecretValues[0]?.createdAt,
    createdByUserId: "user-session-creator",
    secretId: "secret-1",
    sessionId: "session-1",
  }, {
    companyId: "company-1",
    createdAt: copiedSecretValues[1]?.createdAt,
    createdByUserId: "user-session-creator",
    secretId: "secret-2",
    sessionId: "session-1",
  }]);
});

test("SessionManagerService archiveSession interrupts running sessions before publishing the session update", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const deleteQueuedCalls: Array<{ companyId: string; sessionId: string }> = [];
  const updatedValues: Array<Record<string, unknown>> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  let selectCallCount = 0;
  let updateCallCount = 0;
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
          updateCallCount += 1;
          if (updateCallCount === 1) {
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
          }

          if (updateCallCount === 2) {
            return {
              where() {
                return {
                  async returning() {
                    return [];
                  },
                };
              },
            };
          }

          throw new Error("Unexpected update call.");
        },
      };
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not be touched while archiving.");
      },
    },
    sessionQueuedMessageService: {
      async deleteAllForSessionInTransaction(_database: unknown, companyId: string, sessionId: string) {
        deleteQueuedCalls.push({
          companyId,
          sessionId,
        });
      },
    },
  });

  const sessionRecord = await service.archiveSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
  );

  assert.equal(sessionRecord.status, "archived");
  assert.equal(updatedValues[0]?.status, "archived");
  assert.ok(updatedValues[0]?.updated_at instanceof Date);
  assert.deepEqual(deleteQueuedCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
  }]);
  assert.deepEqual(publishCalls, [
    {
      channel: "company:company-1:session:session-1:interrupt",
      message: "",
    },
    {
      channel: "company:company-1:session:session-1:queued:update",
      message: "",
    },
    {
      channel: "company:company-1:session:session-1:update",
      message: "",
    },
  ]);
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

test("SessionManagerService archiveSession does not interrupt stopped sessions", async () => {
  const deleteQueuedCalls: Array<{ companyId: string; sessionId: string }> = [];
  const updatedValues: Array<Record<string, unknown>> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  let selectCallCount = 0;
  let updateCallCount = 0;
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
                  status: "stopped",
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
          updateCallCount += 1;
          if (updateCallCount === 1) {
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
          }

          if (updateCallCount === 2) {
            return {
              where() {
                return {
                  async returning() {
                    return [];
                  },
                };
              },
            };
          }

          throw new Error("Unexpected update call.");
        },
      };
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not be touched while archiving.");
      },
    },
    sessionQueuedMessageService: {
      async deleteAllForSessionInTransaction(_database: unknown, companyId: string, sessionId: string) {
        deleteQueuedCalls.push({
          companyId,
          sessionId,
        });
      },
    },
  });

  const sessionRecord = await service.archiveSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
  );

  assert.equal(sessionRecord.status, "archived");
  assert.equal(updatedValues[0]?.status, "archived");
  assert.deepEqual(deleteQueuedCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
  }]);
  assert.deepEqual(publishCalls, [
    {
      channel: "company:company-1:session:session-1:queued:update",
      message: "",
    },
    {
      channel: "company:company-1:session:session-1:update",
      message: "",
    },
  ]);
});

test("SessionManagerService archiveSession dismisses open human questions for the archived session", async () => {
  const deleteQueuedCalls: Array<{ companyId: string; sessionId: string }> = [];
  const dismissedQuestionUpdateValues: Array<Record<string, unknown>> = [];
  const updatedValues: Array<Record<string, unknown>> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  let selectCallCount = 0;
  let updateCallCount = 0;
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
                  ownerUserId: "user-1",
                  status: "stopped",
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
          updateCallCount += 1;
          if (updateCallCount === 1) {
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
          }

          if (updateCallCount === 2) {
            dismissedQuestionUpdateValues.push(value);
            return {
              where() {
                return {
                  async returning() {
                    return [{ id: "inbox-1" }];
                  },
                };
              },
            };
          }

          throw new Error("Unexpected update call.");
        },
      };
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not be touched while archiving.");
      },
    },
    sessionQueuedMessageService: {
      async deleteAllForSessionInTransaction(_database: unknown, companyId: string, sessionId: string) {
        deleteQueuedCalls.push({
          companyId,
          sessionId,
        });
      },
    },
  });

  const sessionRecord = await service.archiveSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
    "user-1",
  );

  assert.equal(sessionRecord.status, "archived");
  assert.equal(updatedValues[0]?.status, "archived");
  assert.equal(dismissedQuestionUpdateValues[0]?.status, "resolved");
  assert.equal(dismissedQuestionUpdateValues[0]?.resolvedByUserId, "user-1");
  assert.ok(dismissedQuestionUpdateValues[0]?.resolvedAt instanceof Date);
  assert.ok(dismissedQuestionUpdateValues[0]?.updatedAt instanceof Date);
  assert.deepEqual(deleteQueuedCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
  }]);
  assert.deepEqual(publishCalls, [
    {
      channel: "company:company-1:session:session-1:queued:update",
      message: "",
    },
    {
      channel: "company:company-1:session:session-1:update",
      message: "",
    },
    {
      channel: "company:company-1:session:session-1:inbox:update",
      message: "",
    },
    {
      channel: "company:company-1:inbox:human_questions:update",
      message: "",
    },
  ]);
});

test("SessionManagerService unarchiveSession restores archived sessions as stopped chats", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  const updatedValues: Array<Record<string, unknown>> = [];
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
                  status: "archived",
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
                    isCompacting: false,
                    isThinking: false,
                    lastUserMessageAt: new Date("2026-03-25T01:45:00.000Z"),
                    maxContextTokens: null,
                    status: "stopped",
                    thinkingText: null,
                    createdAt: new Date("2026-03-25T01:00:00.000Z"),
                    updatedAt: new Date("2026-03-25T02:30:00.000Z"),
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
  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionQueuedMessageService: {},
  });

  const sessionRecord = await service.unarchiveSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
  );

  assert.equal(sessionRecord.status, "stopped");
  assert.equal(sessionRecord.currentModelId, "gpt-5.4");
  assert.equal(updatedValues[0]?.status, "stopped");
  assert.equal(updatedValues[0]?.isThinking, false);
  assert.equal(updatedValues[0]?.thinkingText, null);
  assert.ok(updatedValues[0]?.updated_at instanceof Date);
  assert.deepEqual(publishCalls, [
    {
      channel: "company:company-1:session:session-1:update",
      message: "",
    },
  ]);
  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "unarchived agent session",
    payload: {
      companyId: "company-1",
      sessionId: "session-1",
    },
  }]);
});

test("SessionManagerService deleteSession removes archived chats and notifies the inbox stream", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  const deleteFilters: unknown[] = [];
  const transaction = {
    select() {
      return {
        from() {
          return {
            async where() {
              return [{
                agentId: "agent-1",
                currentModelProviderCredentialModelId: "model-row-1",
                currentReasoningLevel: "high",
                id: "session-1",
                status: "archived",
              }];
            },
          };
        },
      };
    },
    delete() {
      return {
        async where(condition: unknown) {
          deleteFilters.push(condition);
        },
      };
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionQueuedMessageService: {},
  });

  await service.deleteSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
  );

  assert.equal(deleteFilters.length, 1);
  assert.deepEqual(publishCalls, [
    {
      channel: "company:company-1:inbox:human_questions:update",
      message: "",
    },
  ]);
  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "deleted agent session",
    payload: {
      companyId: "company-1",
      sessionId: "session-1",
    },
  }]);
});

test("SessionManagerService interruptSession publishes the interrupt channel only for running sessions", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  const transaction = {
    select() {
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
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not be touched while interrupting.");
      },
    },
    sessionQueuedMessageService: {},
  });

  await service.interruptSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
  );

  assert.deepEqual(publishCalls, [{
    channel: "company:company-1:session:session-1:interrupt",
    message: "",
  }]);
  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "interrupted agent session",
    payload: {
      companyId: "company-1",
      sessionId: "session-1",
    },
  }]);
});

test("SessionManagerService interruptSession is a no-op for stopped sessions", async () => {
  const publishCalls: Array<{ channel: string; message: string }> = [];
  const transaction = {
    select() {
      return {
        from() {
          return {
            async where() {
              return [{
                agentId: "agent-1",
                currentModelProviderCredentialModelId: "model-row-1",
                currentReasoningLevel: "high",
                id: "session-1",
                status: "stopped",
              }];
            },
          };
        },
      };
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not be touched while interrupting.");
      },
    },
    sessionQueuedMessageService: {},
  });

  await service.interruptSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
  );

  assert.deepEqual(publishCalls, []);
});

test("SessionManagerService updateSessionTitle stores the custom title and publishes a session update", async () => {
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
                  agentId: "agent-1",
                  currentModelProviderCredentialModelId: "model-row-1",
                  currentReasoningLevel: "high",
                  id: "session-1",
                  status: "stopped",
                  userSetTitle: null,
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
                    currentContextTokens: null,
                    inferredTitle: "Original inferred title",
                    isCompacting: false,
                    isThinking: false,
                    maxContextTokens: null,
                    status: "stopped",
                    thinkingText: null,
                    createdAt: new Date("2026-04-04T13:00:00.000Z"),
                    updatedAt: new Date("2026-04-04T13:05:00.000Z"),
                    userSetTitle: "Launch prep",
                  }];
                },
              };
            },
          };
        },
      };
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("updateSessionTitle should not enqueue wake jobs");
      },
    },
    sessionQueuedMessageService: {
      async enqueueInTransaction() {
        throw new Error("updateSessionTitle should not queue messages");
      },
    },
  });

  const sessionRecord = await service.updateSessionTitle(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
    "Launch prep",
  );

  assert.equal(sessionRecord.id, "session-1");
  assert.equal(sessionRecord.currentModelId, "gpt-5.4");
  assert.equal(sessionRecord.userSetTitle, "Launch prep");
  assert.equal(updatedValues.length, 1);
  assert.equal(updatedValues[0]?.userSetTitle, "Launch prep");
  assert.deepEqual(publishCalls, [{
    channel: "company:company-1:session:session-1:update",
    message: "",
  }]);
  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "updated agent session title",
    payload: {
      companyId: "company-1",
      sessionId: "session-1",
      userSetTitle: "Launch prep",
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
  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake(companyId: string, sessionId: string) {
        wakeCalls.push({
          companyId,
          sessionId,
        });
      },
    },
    sessionQueuedMessageService: {
      async enqueueInTransaction(_database: unknown, input: Record<string, unknown>) {
        queuedMessages.push(input);
        return {
          id: "queued-2",
        };
      },
    },
  });

  const sessionRecord = await service.prompt(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-1",
    "Focus on the failed deploy.",
    "model-row-2",
    "medium",
    true,
    [{
      base64EncodedImage: "encoded-image",
      mimeType: "image/png",
    }],
  );

  assert.equal(sessionRecord.id, "session-1");
  assert.equal(sessionRecord.currentModelProviderCredentialModelId, "model-row-2");
  assert.equal(sessionRecord.currentModelId, "gpt-5.4-mini");
  assert.equal(updatedValues[0]?.currentModelProviderCredentialModelId, "model-row-2");
  assert.equal(updatedValues[0]?.currentReasoningLevel, "medium");
  assert.equal(updatedValues[0]?.status, "running");
  assert.deepEqual(queuedMessages, [{
    companyId: "company-1",
    images: [{
      base64EncodedImage: "encoded-image",
      mimeType: "image/png",
    }],
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
      channel: "company:company-1:session:session-1:queued:update",
      message: "",
    },
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

test("SessionManagerService steerQueuedMessage marks the queued row and publishes queue plus steer updates", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not be touched while steering an existing queued row.");
      },
    },
    sessionQueuedMessageService: {
      async markSteer() {
        return {
          createdAt: new Date("2026-03-31T17:00:00.000Z"),
          id: "queued-1",
          images: [],
          sessionId: "session-1",
          shouldSteer: true,
          status: "pending",
          text: "Focus only on the failing integration test.",
          updatedAt: new Date("2026-03-31T17:01:00.000Z"),
        };
      },
    },
  });

  const queuedMessage = await service.steerQueuedMessage(
    SessionManagerServiceTestHarness.createTransactionProviderMock({}) as never,
    "company-1",
    "queued-1",
  );

  assert.equal(queuedMessage.shouldSteer, true);
  assert.deepEqual(publishCalls, [
    {
      channel: "company:company-1:session:session-1:queued:update",
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
    message: "steered queued session message",
    payload: {
      companyId: "company-1",
      queuedMessageId: "queued-1",
      sessionId: "session-1",
    },
  }]);
});

test("SessionManagerService deleteQueuedMessage publishes the queue update", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not be touched while deleting an existing queued row.");
      },
    },
    sessionQueuedMessageService: {
      async deletePendingUserMessage() {
        return {
          createdAt: new Date("2026-03-31T17:00:00.000Z"),
          id: "queued-1",
          images: [],
          sessionId: "session-1",
          shouldSteer: false,
          status: "pending",
          text: "Drop the stale queued prompt before it reaches the worker.",
          updatedAt: new Date("2026-03-31T17:01:00.000Z"),
        };
      },
    },
  });

  const queuedMessage = await service.deleteQueuedMessage(
    SessionManagerServiceTestHarness.createTransactionProviderMock({}) as never,
    "company-1",
    "queued-1",
  );

  assert.equal(queuedMessage.shouldSteer, false);
  assert.deepEqual(publishCalls, [
    {
      channel: "company:company-1:session:session-1:queued:update",
      message: "",
    },
  ]);
  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "deleted queued session message",
    payload: {
      companyId: "company-1",
      queuedMessageId: "queued-1",
      sessionId: "session-1",
    },
  }]);
});

test("SessionManagerService prompt rejects archived sessions without queueing work", async () => {
  const queuedMessages: Array<Record<string, unknown>> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  const wakeCalls: Array<{ companyId: string; sessionId: string }> = [];
  const transaction = {
    select() {
      return {
        from() {
          return {
            async where() {
              return [{
                agentId: "agent-1",
                currentModelProviderCredentialModelId: "model-row-1",
                currentReasoningLevel: "high",
                id: "session-1",
                status: "archived",
              }];
            },
          };
        },
      };
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake(companyId: string, sessionId: string) {
        wakeCalls.push({
          companyId,
          sessionId,
        });
      },
    },
    sessionQueuedMessageService: {
      async enqueueInTransaction(_database: unknown, input: Record<string, unknown>) {
        queuedMessages.push(input);
        return {
          id: "queued-2",
        };
      },
    },
  });

  await assert.rejects(
    service.prompt(
      SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
      "company-1",
      "session-1",
      "Do not accept this.",
    ),
    /Archived sessions cannot receive new messages\./,
  );

  assert.deepEqual(queuedMessages, []);
  assert.deepEqual(publishCalls, []);
  assert.deepEqual(wakeCalls, []);
});

test("SessionManagerService forkSession creates a stopped branch from the selected turn and copies session secrets", async () => {
  const logs: Array<{ bindings: Record<string, unknown>; message: string; payload?: Record<string, unknown> }> = [];
  const publishCalls: Array<{ channel: string; message: string }> = [];
  const insertedSessionValues: Array<Record<string, unknown>> = [];
  const insertedSessionSecretValues: Array<Record<string, unknown>> = [];
  let insertCallCount = 0;
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
                  id: "session-child",
                  inferredTitle: "Review the release plan",
                  status: "stopped",
                  userSetTitle: null,
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
                  companyId: "company-1",
                  contextMessagesSnapshot: [{
                    content: "Child branch context",
                    role: "assistant",
                    timestamp: 1712538600000,
                  }],
                  createdAt: new Date("2026-04-07T19:10:00.000Z"),
                  currentContextTokens: 2048,
                  maxContextTokens: 200000,
                  sessionId: "session-child",
                  turnId: "turn-child-1",
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

      if (selectCallCount === 4) {
        return {
          from() {
            return {
              async where() {
                return [{
                  createdByUserId: "user-original",
                  secretId: "secret-1",
                }];
              },
            };
          },
        };
      }

      throw new Error(`Unexpected select call ${selectCallCount}.`);
    },
    insert() {
      insertCallCount += 1;
      if (insertCallCount === 1) {
        return {
          values(value: Record<string, unknown>) {
            insertedSessionValues.push(value);
            return {
              async returning() {
                return [{
                  id: "session-fork-1",
                  agentId: "agent-1",
                  currentContextTokens: 2048,
                  currentModelProviderCredentialModelId: "model-row-1",
                  currentReasoningLevel: "high",
                  inferredTitle: "Fork of Review the release plan",
                  isCompacting: false,
                  isThinking: false,
                  maxContextTokens: 200000,
                  status: "stopped",
                  thinkingText: null,
                  createdAt: new Date("2026-04-07T19:30:00.000Z"),
                  updatedAt: new Date("2026-04-07T19:30:00.000Z"),
                  userSetTitle: null,
                }];
              },
            };
          },
        };
      }

      if (insertCallCount === 2) {
        return {
          values(value: Record<string, unknown> | Record<string, unknown>[]) {
            if (Array.isArray(value)) {
              insertedSessionSecretValues.push(...value);
            } else {
              insertedSessionSecretValues.push(value);
            }

            return {};
          },
        };
      }

      throw new Error(`Unexpected insert call ${insertCallCount}.`);
    },
  };

  const service = SessionManagerServiceTestHarness.createService({
    logs,
    redisService: {
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
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not run while forking an existing session.");
      },
    },
    sessionQueuedMessageService: {
      async enqueueInTransaction() {
        throw new Error("Forking should not enqueue a new user message.");
      },
    },
  });

  const sessionRecord = await service.forkSession(
    SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
    "company-1",
    "session-child",
    "turn-child-1",
    "user-123",
  );

  assert.equal(sessionRecord.id, "session-fork-1");
  assert.equal(sessionRecord.currentModelId, "gpt-5.4");
  assert.equal(insertedSessionValues.length, 1);
  assert.equal(insertedSessionValues[0]?.companyId, "company-1");
  assert.equal(insertedSessionValues[0]?.forkedFromTurnId, "turn-child-1");
  assert.equal(insertedSessionValues[0]?.status, "stopped");
  assert.equal(insertedSessionValues[0]?.inferredTitle, "Fork of Review the release plan");
  assert.equal(insertedSessionValues[0]?.ownerUserId, "user-123");
  assert.deepEqual(insertedSessionValues[0]?.contextMessagesSnapshot, [{
    content: "Child branch context",
    role: "assistant",
    timestamp: 1712538600000,
  }]);
  assert.equal(
    (insertedSessionValues[0]?.contextMessagesSnapshotAt as Date | undefined)?.toISOString(),
    "2026-04-07T19:10:00.000Z",
  );
  assert.equal(insertedSessionValues[0]?.currentContextTokens, 2048);
  assert.equal(insertedSessionValues[0]?.maxContextTokens, 200000);
  assert.deepEqual(insertedSessionSecretValues, [{
    companyId: "company-1",
    createdAt: insertedSessionSecretValues[0]?.createdAt,
    createdByUserId: "user-123",
    secretId: "secret-1",
    sessionId: "session-fork-1",
  }]);
  assert.deepEqual(publishCalls, [{
    channel: "company:company-1:session:session-fork-1:update",
    message: "",
  }]);
  assert.deepEqual(logs, [{
    bindings: {
      component: "session_manager_service",
    },
    message: "forked agent session",
    payload: {
      checkpointSessionId: "session-child",
      companyId: "company-1",
      forkedFromTurnId: "turn-child-1",
      sessionId: "session-fork-1",
      sourceSessionId: "session-child",
    },
  }]);
});

test("SessionManagerService prompt rejects sessions owned by another user", async () => {
  const transaction = {
    select() {
      return {
        from() {
          return {
            async where() {
              return [{
                agentId: "agent-1",
                currentModelProviderCredentialModelId: "model-row-1",
                currentReasoningLevel: "high",
                id: "session-1",
                ownerUserId: "user-999",
                status: "stopped",
              }];
            },
          };
        },
      };
    },
  };
  const service = SessionManagerServiceTestHarness.createService({
    redisService: {
      async getClient() {
        throw new Error("Redis should not be touched when access is denied.");
      },
    },
    sessionProcessQueueService: {
      async enqueueSessionWake() {
        throw new Error("Wake queue should not run when access is denied.");
      },
    },
    sessionQueuedMessageService: {
      async enqueueInTransaction() {
        throw new Error("Queued messages should not be created when access is denied.");
      },
    },
  });

  await assert.rejects(
    service.prompt(
      SessionManagerServiceTestHarness.createTransactionProviderMock(transaction) as never,
      "company-1",
      "session-1",
      "Do not accept this.",
      undefined,
      undefined,
      false,
      undefined,
      "user-123",
    ),
    /Session not found\./,
  );
});
