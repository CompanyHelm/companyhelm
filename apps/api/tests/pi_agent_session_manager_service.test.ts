import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { PiAgentSessionManagerService } from "../src/services/agent/session/pi_agent_session_manager_service.ts";

const piAgentMocks = vi.hoisted(() => {
  return {
    setRuntimeApiKeyMock: vi.fn<(providerId: string, apiKey: string) => void>(),
    newSessionMock: vi.fn<(options: { id?: string }) => void>(),
    createAgentSessionMock: vi.fn(),
    disposeMock: vi.fn(),
    authStorageInstances: [] as Array<{ setRuntimeApiKey: ReturnType<typeof vi.fn> }>,
    modelRegistryInstances: [] as Array<{ authStorage: unknown }>,
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
  piAgentMocks.newSessionMock.mockReset();
  piAgentMocks.createAgentSessionMock.mockReset();
  piAgentMocks.disposeMock.mockReset();
  piAgentMocks.authStorageInstances.length = 0;
  piAgentMocks.modelRegistryInstances.length = 0;
  piAgentMocks.sessionManagerInstances.length = 0;
});

test("PiAgentSessionManagerService creates and stores an in-memory PI session", async () => {
  const createdSession = {
    dispose: piAgentMocks.disposeMock,
    marker: "first-session",
  };
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiAgentSessionManagerService();

  const session = await service.create("session-1", "sk-test", "openai");

  assert.equal(session, createdSession);
  assert.equal(service.get("session-1"), createdSession);
  assert.equal(piAgentMocks.authStorageInstances.length, 1);
  assert.equal(piAgentMocks.sessionManagerInstances.length, 1);
  assert.equal(piAgentMocks.modelRegistryInstances.length, 1);
  assert.equal(piAgentMocks.modelRegistryInstances[0]?.authStorage, piAgentMocks.authStorageInstances[0]);
  assert.deepEqual(piAgentMocks.setRuntimeApiKeyMock.mock.calls, [["openai", "sk-test"]]);
  assert.deepEqual(piAgentMocks.newSessionMock.mock.calls, [[{ id: "session-1" }]]);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls.length, 1);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0]?.authStorage, piAgentMocks.authStorageInstances[0]);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0]?.modelRegistry, piAgentMocks.modelRegistryInstances[0]);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0]?.sessionManager, piAgentMocks.sessionManagerInstances[0]);
});

test("PiAgentSessionManagerService replaces an existing session for the same id", async () => {
  const firstSession = {
    dispose: piAgentMocks.disposeMock,
    marker: "first-session",
  };
  const secondSession = {
    dispose: vi.fn(),
    marker: "second-session",
  };
  piAgentMocks.createAgentSessionMock
    .mockResolvedValueOnce({
      session: firstSession,
    })
    .mockResolvedValueOnce({
      session: secondSession,
    });
  const service = new PiAgentSessionManagerService();

  await service.create("session-1", "sk-first", "openai");
  const replacedSession = await service.create("session-1", "sk-second", "anthropic");

  assert.equal(replacedSession, secondSession);
  assert.equal(service.get("session-1"), secondSession);
  assert.equal(piAgentMocks.disposeMock.mock.calls.length, 1);
  assert.deepEqual(piAgentMocks.setRuntimeApiKeyMock.mock.calls, [
    ["openai", "sk-first"],
    ["anthropic", "sk-second"],
  ]);
});
