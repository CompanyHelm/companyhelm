import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { PiMonoSessionManagerService } from "../src/services/agent/session/pi-mono/session_manager_service.ts";

const piAgentMocks = vi.hoisted(() => {
  return {
    abortMock: vi.fn(async () => undefined),
    createAgentSessionMock: vi.fn(),
    disposeMock: vi.fn(),
    findModelMock: vi.fn<(providerId: string, modelId: string) => unknown>(),
    newSessionMock: vi.fn<(options: { id?: string }) => void>(),
    promptMock: vi.fn(async () => undefined),
    replaceMessagesMock: vi.fn<(messages: unknown[]) => void>(),
    setRuntimeApiKeyMock: vi.fn<(providerId: string, apiKey: string) => void>(),
    steerMock: vi.fn(async () => undefined),
    subscribeMock: vi.fn(),
    authStorageInstances: [] as Array<{ setRuntimeApiKey: ReturnType<typeof vi.fn> }>,
    modelRegistryInstances: [] as Array<{ authStorage: unknown; find: ReturnType<typeof vi.fn> }>,
    sessionManagerInstances: [] as Array<{ newSession: ReturnType<typeof vi.fn> }>,
  };
});

vi.mock("@mariozechner/pi-coding-agent", () => {
  class MockAuthStorage {
    setRuntimeApiKey = piAgentMocks.setRuntimeApiKeyMock;

    static inMemory() {
      const instance = new MockAuthStorage();
      piAgentMocks.authStorageInstances.push(instance);
      return instance;
    }
  }

  class MockModelRegistry {
    readonly authStorage: unknown;
    find = piAgentMocks.findModelMock;

    constructor(authStorage: unknown) {
      this.authStorage = authStorage;
      piAgentMocks.modelRegistryInstances.push(this);
    }
  }

  class MockSessionManager {
    newSession = piAgentMocks.newSessionMock;

    static inMemory() {
      const instance = new MockSessionManager();
      piAgentMocks.sessionManagerInstances.push(instance);
      return instance;
    }
  }

  return {
    AuthStorage: MockAuthStorage,
    ModelRegistry: MockModelRegistry,
    SessionManager: MockSessionManager,
    createAgentSession: piAgentMocks.createAgentSessionMock,
  };
});

beforeEach(() => {
  piAgentMocks.abortMock.mockReset();
  piAgentMocks.createAgentSessionMock.mockReset();
  piAgentMocks.disposeMock.mockReset();
  piAgentMocks.findModelMock.mockReset();
  piAgentMocks.newSessionMock.mockReset();
  piAgentMocks.promptMock.mockReset();
  piAgentMocks.replaceMessagesMock.mockReset();
  piAgentMocks.setRuntimeApiKeyMock.mockReset();
  piAgentMocks.steerMock.mockReset();
  piAgentMocks.subscribeMock.mockReset();
  piAgentMocks.authStorageInstances.length = 0;
  piAgentMocks.modelRegistryInstances.length = 0;
  piAgentMocks.sessionManagerInstances.length = 0;
});

test("PiMonoSessionManagerService creates one runtime session and routes prompt plus steer calls through it", async () => {
  const storedMessages = [{
    content: "Earlier context",
    role: "user",
    timestamp: 1234,
  }];
  const persistedContextUpdates: Array<Record<string, unknown>> = [];
  const model = {
    id: "gpt-5.4",
    provider: "openai",
  };
  const createdSession = {
    abort: piAgentMocks.abortMock,
    agent: {
      replaceMessages: piAgentMocks.replaceMessagesMock,
      state: {
        messages: [{
          content: "Updated context",
          role: "assistant",
          timestamp: 5678,
        }],
      },
    },
    dispose: piAgentMocks.disposeMock,
    prompt: piAgentMocks.promptMock,
    steer: piAgentMocks.steerMock,
    subscribe: piAgentMocks.subscribeMock,
  };
  piAgentMocks.findModelMock.mockReturnValue(model);
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiMonoSessionManagerService({
    async getClient() {
      return {
        async publish() {
          return 1;
        },
      };
    },
  } as never);

  const session = await service.ensureSession(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      contextMessages: storedMessages,
                    }];
                  },
                };
              },
            };
          },
          update() {
            return {
              set(value: Record<string, unknown>) {
                persistedContextUpdates.push(value);
                return {
                  async where() {
                    return undefined;
                  },
                };
              },
            };
          },
        });
      },
    } as never,
    "session-1",
    {
      apiKey: "sk-test",
      modelId: "gpt-5.4",
      providerId: "openai",
      reasoningLevel: "high",
    },
  );

  await service.prompt({
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        update() {
          return {
            set(value: Record<string, unknown>) {
              persistedContextUpdates.push(value);
              return {
                async where() {
                  return undefined;
                },
              };
            },
          };
        },
      });
    },
  } as never, "session-1", "Draft the migration.");
  await service.steer({
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        update() {
          return {
            set(value: Record<string, unknown>) {
              persistedContextUpdates.push(value);
              return {
                async where() {
                  return undefined;
                },
              };
            },
          };
        },
      });
    },
  } as never, "session-1", "Focus on the failed migration.");
  await service.abort("session-1");

  assert.equal(session, createdSession);
  assert.equal(service.get("session-1"), createdSession);
  assert.deepEqual(piAgentMocks.findModelMock.mock.calls, [["openai", "gpt-5.4"]]);
  assert.deepEqual(piAgentMocks.setRuntimeApiKeyMock.mock.calls, [["openai", "sk-test"]]);
  assert.deepEqual(piAgentMocks.newSessionMock.mock.calls, [[{ id: "session-1" }]]);
  assert.deepEqual(piAgentMocks.replaceMessagesMock.mock.calls, [[storedMessages]]);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls.length, 1);
  assert.deepEqual(piAgentMocks.promptMock.mock.calls, [["Draft the migration.", undefined]]);
  assert.deepEqual(piAgentMocks.steerMock.mock.calls, [["Focus on the failed migration.", undefined]]);
  assert.equal(piAgentMocks.abortMock.mock.calls.length, 1);
  assert.equal(persistedContextUpdates.length, 2);
  assert.deepEqual(
    persistedContextUpdates.map((value) => value.context_messages),
    [createdSession.agent.state.messages, createdSession.agent.state.messages],
  );
});

test("PiMonoSessionManagerService reuses the live runtime session for repeated ensureSession calls", async () => {
  const createdSession = {
    abort: piAgentMocks.abortMock,
    agent: {
      replaceMessages: piAgentMocks.replaceMessagesMock,
      state: {
        messages: [],
      },
    },
    dispose: piAgentMocks.disposeMock,
    prompt: piAgentMocks.promptMock,
    steer: piAgentMocks.steerMock,
    subscribe: piAgentMocks.subscribeMock,
  };
  piAgentMocks.findModelMock.mockReturnValue({
    id: "gpt-5.4",
    provider: "openai",
  });
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiMonoSessionManagerService({
    async getClient() {
      return {
        async publish() {
          return 1;
        },
      };
    },
  } as never);

  const first = await service.ensureSession(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      contextMessages: [],
                    }];
                  },
                };
              },
            };
          },
        });
      },
    } as never,
    "session-1",
    {
      apiKey: "sk-test",
      modelId: "gpt-5.4",
      providerId: "openai",
      reasoningLevel: "medium",
    },
  );
  const second = await service.ensureSession(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      contextMessages: [{
                        content: "ignored on reuse",
                        role: "user",
                        timestamp: 1,
                      }],
                    }];
                  },
                };
              },
            };
          },
        });
      },
    } as never,
    "session-1",
    {
      apiKey: "sk-test-2",
      modelId: "gpt-5.4",
      providerId: "openai",
      reasoningLevel: "low",
    },
  );

  assert.equal(first, createdSession);
  assert.equal(second, createdSession);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls.length, 1);
  assert.equal(piAgentMocks.disposeMock.mock.calls.length, 0);
  assert.deepEqual(piAgentMocks.replaceMessagesMock.mock.calls, [[[]]]);
});
