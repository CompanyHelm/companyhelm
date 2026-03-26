import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { PiMonoSessionManagerService } from "../src/services/agent/session/pi-mono/session_manager_service.ts";

const piAgentMocks = vi.hoisted(() => {
  return {
    setRuntimeApiKeyMock: vi.fn<(providerId: string, apiKey: string) => void>(),
    findModelMock: vi.fn<(providerId: string, modelId: string) => unknown>(),
    newSessionMock: vi.fn<(options: { id?: string }) => void>(),
    createAgentSessionMock: vi.fn(),
    disposeMock: vi.fn(),
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
  piAgentMocks.setRuntimeApiKeyMock.mockReset();
  piAgentMocks.findModelMock.mockReset();
  piAgentMocks.newSessionMock.mockReset();
  piAgentMocks.createAgentSessionMock.mockReset();
  piAgentMocks.disposeMock.mockReset();
  piAgentMocks.subscribeMock.mockReset();
  piAgentMocks.authStorageInstances.length = 0;
  piAgentMocks.modelRegistryInstances.length = 0;
  piAgentMocks.sessionManagerInstances.length = 0;
});

test("PiMonoSessionManagerService creates and stores an in-memory PI session", async () => {
  const model = {
    id: "gpt-5.4",
    provider: "openai",
  };
  const createdSession = {
    dispose: piAgentMocks.disposeMock,
    marker: "first-session",
    subscribe: piAgentMocks.subscribeMock,
  };
  piAgentMocks.findModelMock.mockReturnValue(model);
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiMonoSessionManagerService();

  const session = await service.create({ transaction: async () => undefined } as never, "session-1", "sk-test", "openai", "gpt-5.4", "high");

  assert.equal(session, createdSession);
  assert.equal(service.get("session-1"), createdSession);
  assert.equal(piAgentMocks.authStorageInstances.length, 1);
  assert.equal(piAgentMocks.sessionManagerInstances.length, 1);
  assert.equal(piAgentMocks.modelRegistryInstances.length, 1);
  assert.equal(piAgentMocks.modelRegistryInstances[0]?.authStorage, piAgentMocks.authStorageInstances[0]);
  assert.deepEqual(piAgentMocks.findModelMock.mock.calls, [["openai", "gpt-5.4"]]);
  assert.deepEqual(piAgentMocks.setRuntimeApiKeyMock.mock.calls, [["openai", "sk-test"]]);
  assert.deepEqual(piAgentMocks.newSessionMock.mock.calls, [[{ id: "session-1" }]]);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls.length, 1);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0]?.authStorage, piAgentMocks.authStorageInstances[0]);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0]?.modelRegistry, piAgentMocks.modelRegistryInstances[0]);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0]?.sessionManager, piAgentMocks.sessionManagerInstances[0]);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0]?.model, model);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0]?.thinkingLevel, "high");
});

test("PiMonoSessionManagerService replaces an existing session for the same id", async () => {
  const firstModel = {
    id: "gpt-5.4",
    provider: "openai",
  };
  const secondModel = {
    id: "claude-sonnet-4-5",
    provider: "anthropic",
  };
  const firstSession = {
    dispose: piAgentMocks.disposeMock,
    marker: "first-session",
    subscribe: piAgentMocks.subscribeMock,
  };
  const secondSession = {
    dispose: vi.fn(),
    marker: "second-session",
    subscribe: vi.fn(),
  };
  piAgentMocks.findModelMock
    .mockReturnValueOnce(firstModel)
    .mockReturnValueOnce(secondModel);
  piAgentMocks.createAgentSessionMock
    .mockResolvedValueOnce({
      session: firstSession,
    })
    .mockResolvedValueOnce({
      session: secondSession,
    });
  const service = new PiMonoSessionManagerService();

  await service.create({ transaction: async () => undefined } as never, "session-1", "sk-first", "openai", "gpt-5.4", "medium");
  const replacedSession = await service.create({ transaction: async () => undefined } as never, "session-1", "sk-second", "anthropic", "claude-sonnet-4-5", "low");

  assert.equal(replacedSession, secondSession);
  assert.equal(service.get("session-1"), secondSession);
  assert.equal(piAgentMocks.disposeMock.mock.calls.length, 1);
  assert.deepEqual(piAgentMocks.findModelMock.mock.calls, [
    ["openai", "gpt-5.4"],
    ["anthropic", "claude-sonnet-4-5"],
  ]);
  assert.deepEqual(piAgentMocks.setRuntimeApiKeyMock.mock.calls, [
    ["openai", "sk-first"],
    ["anthropic", "sk-second"],
  ]);
});
