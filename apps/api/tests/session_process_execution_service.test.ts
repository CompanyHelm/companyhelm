import assert from "node:assert/strict";
import { test } from "vitest";
import { SessionProcessExecutionService } from "../src/services/agent/session/process/execution.ts";
import { SessionProcessQueuedNames } from "../src/services/agent/session/process/queued_names.ts";

test("SessionProcessExecutionService no-ops when another worker already owns the lease", async () => {
  const service = new SessionProcessExecutionService(
    {
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback({});
      },
    } as never,
    {
      child() {
        return {
          debug() {},
        };
      },
    } as never,
    {
      async ensureSession() {
        throw new Error("ensureSession should not be called.");
      },
    } as never,
    {
      async getClient() {
        throw new Error("Redis should not be used without a lease.");
      },
    } as never,
    {
      async acquire() {
        return null;
      },
    } as never,
    {
      async enqueueSessionWake() {
        throw new Error("Queue should not be touched without a lease.");
      },
    } as never,
    new SessionProcessQueuedNames(),
    {
      async listProcessable() {
        throw new Error("Queued messages should not be loaded without a lease.");
      },
    } as never,
  );

  await service.execute("company-1", "session-1");
});

test("SessionProcessExecutionService prompts one queued turn, releases the lease, and re-enqueues when more work remains", async () => {
  const ensureSessionCalls: unknown[] = [];
  const disposeCalls: string[] = [];
  const promptCalls: Array<{ createdAt: Date | undefined; images: unknown; sessionId: string; text: string }> = [];
  const queueWakeCalls: Array<{ companyId: string; sessionId: string }> = [];
  const releaseCalls: Array<{ companyId: string; sessionId: string; token: string }> = [];
  const markProcessingCalls: string[][] = [];
  const deleteProcessedCalls: string[][] = [];
  const subscriber = {
    isOpen: true,
    async connect() {
      return this;
    },
    async subscribe() {},
    async unsubscribe() {},
    async quit() {},
  };
  let selectCallCount = 0;
  const service = new SessionProcessExecutionService(
    {
      async withCompanyContext(companyId: string, callback: (database: unknown) => Promise<unknown>) {
        assert.equal(companyId, "company-1");
        return callback({
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
                        status: "queued",
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
                        encryptedApiKey: "sk-openai",
                        modelProvider: "openai",
                      }];
                    },
                  };
                },
              };
            }

            throw new Error("Unexpected select call.");
          },
        });
      },
    } as never,
    {
      child() {
        return {
          debug() {},
          error() {},
        };
      },
    } as never,
    {
      async ensureSession(_transactionProvider: unknown, sessionId: string, runtimeConfig: unknown) {
        ensureSessionCalls.push({
          runtimeConfig,
          sessionId,
        });
      },
      dispose(sessionId: string) {
        disposeCalls.push(sessionId);
      },
      async prompt(
        _transactionProvider: unknown,
        sessionId: string,
        text: string,
        images?: unknown,
        createdAt?: Date,
      ) {
        promptCalls.push({
          createdAt,
          images,
          sessionId,
          text,
        });
      },
    } as never,
    {
      async getClient() {
        return {
          async publish() {
            return 1;
          },
          duplicate() {
            return subscriber;
          },
        };
      },
    } as never,
    {
      async acquire(companyId: string, sessionId: string) {
        return {
          companyId,
          sessionId,
          token: "lease-token",
        };
      },
      async heartbeat() {
        return true;
      },
      async release(handle: { companyId: string; sessionId: string; token: string }) {
        releaseCalls.push(handle);
      },
    } as never,
    {
      async enqueueSessionWake(companyId: string, sessionId: string) {
        queueWakeCalls.push({
          companyId,
          sessionId,
        });
      },
    } as never,
    new SessionProcessQueuedNames(),
    {
      async listProcessable() {
        return [{
          createdAt: new Date("2026-03-26T12:00:00.000Z"),
          id: "queued-1",
          images: [],
          sessionId: "session-1",
          shouldSteer: false,
          status: "pending",
          text: "Investigate the regression.",
          updatedAt: new Date("2026-03-26T12:00:00.000Z"),
        }];
      },
      async listPendingSteer() {
        return [];
      },
      async markProcessing(_transactionProvider: unknown, _companyId: string, ids: string[]) {
        markProcessingCalls.push(ids);
      },
      async deleteProcessed(_transactionProvider: unknown, _companyId: string, ids: string[]) {
        deleteProcessedCalls.push(ids);
      },
      async markPending() {
        throw new Error("markPending should not be called on the happy path.");
      },
      async hasPendingMessages() {
        return true;
      },
    } as never,
  );

  await service.execute("company-1", "session-1");

  assert.deepEqual(ensureSessionCalls, [{
    runtimeConfig: {
      agentId: "agent-1",
      apiKey: "sk-openai",
      companyId: "company-1",
      modelId: "gpt-5.4",
      providerId: "openai",
      reasoningLevel: "high",
    },
    sessionId: "session-1",
  }]);
  assert.deepEqual(promptCalls, [{
    createdAt: new Date("2026-03-26T12:00:00.000Z"),
    images: [],
    sessionId: "session-1",
    text: "Investigate the regression.",
  }]);
  assert.deepEqual(markProcessingCalls, [["queued-1"]]);
  assert.deepEqual(deleteProcessedCalls, [["queued-1"]]);
  assert.deepEqual(releaseCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
    token: "lease-token",
  }]);
  assert.deepEqual(queueWakeCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
  }]);
  assert.deepEqual(disposeCalls, ["session-1"]);
});

test("SessionProcessExecutionService disposes the runtime session even when turn processing fails", async () => {
  const disposeCalls: string[] = [];
  const enqueueSessionWakeCalls: Array<{ companyId: string; sessionId: string }> = [];
  const releaseCalls: Array<{ companyId: string; sessionId: string; token: string }> = [];
  const subscriber = {
    isOpen: true,
    async connect() {
      return this;
    },
    async subscribe() {},
    async unsubscribe() {},
    async quit() {},
  };
  let selectCallCount = 0;
  const service = new SessionProcessExecutionService(
    {
      async withCompanyContext(companyId: string, callback: (database: unknown) => Promise<unknown>) {
        assert.equal(companyId, "company-1");
        return callback({
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
                        status: "queued",
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
                        encryptedApiKey: "sk-openai",
                        modelProvider: "openai",
                      }];
                    },
                  };
                },
              };
            }

            throw new Error("Unexpected select call.");
          },
        });
      },
    } as never,
    {
      child() {
        return {
          debug() {},
          error() {},
        };
      },
    } as never,
    {
      async ensureSession() {
        return undefined;
      },
      dispose(sessionId: string) {
        disposeCalls.push(sessionId);
      },
      async prompt() {
        throw new Error("prompt failed");
      },
    } as never,
    {
      async getClient() {
        return {
          async publish() {
            return 1;
          },
          duplicate() {
            return subscriber;
          },
        };
      },
    } as never,
    {
      async acquire(companyId: string, sessionId: string) {
        return {
          companyId,
          sessionId,
          token: "lease-token",
        };
      },
      async heartbeat() {
        return true;
      },
      async release(handle: { companyId: string; sessionId: string; token: string }) {
        releaseCalls.push(handle);
      },
    } as never,
    {
      async enqueueSessionWake(companyId: string, sessionId: string) {
        enqueueSessionWakeCalls.push({
          companyId,
          sessionId,
        });
      },
    } as never,
    new SessionProcessQueuedNames(),
    {
      async listProcessable() {
        return [{
          createdAt: new Date("2026-03-26T12:00:00.000Z"),
          id: "queued-1",
          images: [],
          sessionId: "session-1",
          shouldSteer: false,
          status: "pending",
          text: "Investigate the regression.",
          updatedAt: new Date("2026-03-26T12:00:00.000Z"),
        }];
      },
      async listPendingSteer() {
        return [];
      },
      async markProcessing() {
        return undefined;
      },
      async deleteProcessed() {
        throw new Error("deleteProcessed should not be called after a failed prompt.");
      },
      async markPending() {
        return undefined;
      },
      async hasPendingMessages() {
        return true;
      },
    } as never,
  );

  await assert.rejects(
    service.execute("company-1", "session-1"),
    /prompt failed/,
  );

  assert.deepEqual(disposeCalls, ["session-1"]);
  assert.deepEqual(releaseCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
    token: "lease-token",
  }]);
  assert.deepEqual(enqueueSessionWakeCalls, []);
});

test("SessionProcessExecutionService aborts the active prompt when an interrupt signal arrives", async () => {
  const abortCalls: string[] = [];
  const clearQueuedCalls: Array<{ companyId: string; sessionId: string }> = [];
  const disposeCalls: string[] = [];
  const releaseCalls: Array<{ companyId: string; sessionId: string; token: string }> = [];
  const subscribedListeners = new Map<string, () => void>();
  const subscriber = {
    isOpen: true,
    async connect() {
      return this;
    },
    async subscribe(channel: string, listener: () => void) {
      subscribedListeners.set(channel, listener);
    },
    async unsubscribe() {
      return undefined;
    },
    async quit() {},
  };
  let selectCallCount = 0;
  let resolvePromptStarted: (() => void) | null = null;
  const promptStarted = new Promise<void>((resolve) => {
    resolvePromptStarted = resolve;
  });
  const service = new SessionProcessExecutionService(
    {
      async withCompanyContext(companyId: string, callback: (database: unknown) => Promise<unknown>) {
        assert.equal(companyId, "company-1");
        return callback({
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
                        encryptedApiKey: "sk-openai",
                        modelProvider: "openai",
                      }];
                    },
                  };
                },
              };
            }

            throw new Error("Unexpected select call.");
          },
        });
      },
    } as never,
    {
      child() {
        return {
          debug() {},
          error() {},
        };
      },
    } as never,
    {
      async ensureSession() {
        return undefined;
      },
      async abort(sessionId: string) {
        abortCalls.push(sessionId);
      },
      dispose(sessionId: string) {
        disposeCalls.push(sessionId);
      },
      async prompt() {
        resolvePromptStarted?.();
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      },
    } as never,
    {
      async getClient() {
        return {
          async publish() {
            return 1;
          },
          duplicate() {
            return subscriber;
          },
        };
      },
    } as never,
    {
      async acquire(companyId: string, sessionId: string) {
        return {
          companyId,
          sessionId,
          token: "lease-token",
        };
      },
      async heartbeat() {
        return true;
      },
      async release(handle: { companyId: string; sessionId: string; token: string }) {
        releaseCalls.push(handle);
      },
    } as never,
    {
      async enqueueSessionWake() {
        throw new Error("Interrupted sessions should not enqueue a follow-up wake.");
      },
    } as never,
    new SessionProcessQueuedNames(),
    {
      async listProcessable() {
        return [{
          createdAt: new Date("2026-03-26T12:00:00.000Z"),
          id: "queued-1",
          images: [],
          sessionId: "session-1",
          shouldSteer: false,
          status: "pending",
          text: "Investigate the regression.",
          updatedAt: new Date("2026-03-26T12:00:00.000Z"),
        }];
      },
      async listPendingSteer() {
        return [];
      },
      async markProcessing() {
        return undefined;
      },
      async deleteProcessed() {
        throw new Error("deleteProcessed should not be called after an interrupt.");
      },
      async deleteAllForSession(_transactionProvider: unknown, companyId: string, sessionId: string) {
        clearQueuedCalls.push({
          companyId,
          sessionId,
        });
      },
      async markPending() {
        return undefined;
      },
      async hasPendingMessages() {
        return false;
      },
    } as never,
  );

  const executionPromise = service.execute("company-1", "session-1");
  await promptStarted;
  subscribedListeners.get("company:company-1:session:session-1:interrupt")?.();

  await executionPromise;
  assert.deepEqual(abortCalls, ["session-1"]);
  assert.deepEqual(clearQueuedCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
  }]);
  assert.deepEqual(disposeCalls, ["session-1"]);
  assert.deepEqual(releaseCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
    token: "lease-token",
  }]);
});

test("SessionProcessExecutionService clears queued work and exits quietly for archived sessions", async () => {
  const clearQueuedCalls: Array<{ companyId: string; sessionId: string }> = [];
  const disposeCalls: string[] = [];
  const releaseCalls: Array<{ companyId: string; sessionId: string; token: string }> = [];
  let selectCallCount = 0;
  const service = new SessionProcessExecutionService(
    {
      async withCompanyContext(companyId: string, callback: (database: unknown) => Promise<unknown>) {
        assert.equal(companyId, "company-1");
        return callback({
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
                        status: "archived",
                      }];
                    },
                  };
                },
              };
            }

            throw new Error("Unexpected select call.");
          },
        });
      },
    } as never,
    {
      child() {
        return {
          debug() {},
          error() {},
        };
      },
    } as never,
    {
      async ensureSession() {
        throw new Error("ensureSession should not run for archived sessions.");
      },
      async prompt() {
        throw new Error("prompt should not run for archived sessions.");
      },
      dispose(sessionId: string) {
        disposeCalls.push(sessionId);
      },
    } as never,
    {
      async getClient() {
        return {
          async publish() {
            return 1;
          },
          duplicate() {
            return {
              isOpen: true,
              async connect() {
                return this;
              },
              async subscribe() {},
              async unsubscribe() {},
              async quit() {},
            };
          },
        };
      },
    } as never,
    {
      async acquire(companyId: string, sessionId: string) {
        return {
          companyId,
          sessionId,
          token: "lease-token",
        };
      },
      async heartbeat() {
        return true;
      },
      async release(handle: { companyId: string; sessionId: string; token: string }) {
        releaseCalls.push(handle);
      },
    } as never,
    {
      async enqueueSessionWake() {
        throw new Error("Archived sessions should not enqueue wake jobs.");
      },
    } as never,
    new SessionProcessQueuedNames(),
    {
      async listProcessable() {
        return [{
          createdAt: new Date("2026-03-26T12:00:00.000Z"),
          id: "queued-1",
          images: [],
          sessionId: "session-1",
          shouldSteer: false,
          status: "pending",
          text: "Investigate the regression.",
          updatedAt: new Date("2026-03-26T12:00:00.000Z"),
        }];
      },
      async deleteAllForSession(_transactionProvider: unknown, companyId: string, sessionId: string) {
        clearQueuedCalls.push({
          companyId,
          sessionId,
        });
      },
      async listPendingSteer() {
        throw new Error("listPendingSteer should not run for archived sessions.");
      },
      async markProcessing() {
        throw new Error("markProcessing should not run for archived sessions.");
      },
      async deleteProcessed() {
        throw new Error("deleteProcessed should not run for archived sessions.");
      },
      async markPending() {
        throw new Error("markPending should not run for archived sessions.");
      },
      async hasPendingMessages() {
        throw new Error("hasPendingMessages should not run for archived sessions.");
      },
    } as never,
  );

  await service.execute("company-1", "session-1");

  assert.deepEqual(clearQueuedCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
  }]);
  assert.deepEqual(disposeCalls, ["session-1"]);
  assert.deepEqual(releaseCalls, [{
    companyId: "company-1",
    sessionId: "session-1",
    token: "lease-token",
  }]);
});
