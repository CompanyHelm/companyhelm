import assert from "node:assert/strict";
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { test, vi } from "vitest";
import { AgentToolsService } from "../src/services/agent/tools_service.ts";

test("AgentToolsService initializes the environment-backed terminal tool catalog once per prompt scope", () => {
  const service = new AgentToolsService({
    async dispose() {
      return undefined;
    },
    async getEnvironment() {
      throw new Error("tools should not acquire the environment during initialization");
    },
  } as never);

  const tools = service.initializeTools();

  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "list_pty_sessions",
      "execute_command",
      "send_pty_input",
      "read_pty_output",
      "resize_pty",
      "kill_session",
      "close_session",
    ],
  );
  assert.equal(service.initializeTools(), tools);
});

test("AgentToolsService cleanup disposes the prompt scope", async () => {
  const dispose = vi.fn(async () => undefined);
  const service = new AgentToolsService({
    async dispose() {
      await dispose();
    },
    async getEnvironment() {
      throw new Error("tools should not acquire the environment during cleanup");
    },
  } as never);

  service.initializeTools();
  await service.cleanupTools();

  assert.equal(dispose.mock.calls.length, 1);
});

test("AgentToolsService custom tools can be injected into a live PI Mono session", async () => {
  const authStorage = AuthStorage.inMemory();
  authStorage.setRuntimeApiKey("openai", "sk-test");
  const modelRegistry = new ModelRegistry(authStorage);
  const model = modelRegistry.find("openai", "gpt-5.4");
  if (!model) {
    throw new Error("Model not found.");
  }

  const service = new AgentToolsService({
    async dispose() {
      return undefined;
    },
    async getEnvironment() {
      throw new Error("session creation should not eagerly acquire the environment");
    },
  } as never);

  const sessionManager = SessionManager.inMemory();
  sessionManager.newSession({
    id: "session-1",
  });
  const tools = service.initializeTools();
  const { session } = await createAgentSession({
    authStorage,
    tools: [],
    customTools: tools,
    model,
    modelRegistry,
    sessionManager,
    thinkingLevel: "low",
  });
  session.setActiveToolsByName(tools.map((tool) => tool.name));

  assert.deepEqual(
    session.agent.state.tools.map((tool) => tool.name),
    [
      "list_pty_sessions",
      "execute_command",
      "send_pty_input",
      "read_pty_output",
      "resize_pty",
      "kill_session",
      "close_session",
    ],
  );

  session.dispose();
});
