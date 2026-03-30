import assert from "node:assert/strict";
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { test, vi } from "vitest";
import { AgentGithubToolProvider } from "../src/services/agent/tools/github/provider.ts";
import { AgentToolsService } from "../src/services/agent/tools/service.ts";
import { AgentTerminalToolProvider } from "../src/services/agent/tools/terminal/provider.ts";

test("AgentToolsService initializes the environment-backed terminal tool catalog once per prompt scope", () => {
  const service = new AgentToolsService({
    async dispose() {
      return undefined;
    },
    async getEnvironment() {
      throw new Error("tools should not acquire the environment during initialization");
    },
  } as never, [
    new AgentTerminalToolProvider({
      async getEnvironment() {
        throw new Error("tools should not acquire the environment during initialization");
      },
    } as never),
    new AgentGithubToolProvider({
      async getEnvironment() {
        throw new Error("tools should not acquire the environment during initialization");
      },
    } as never, {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during initialization");
      },
      async listInstallations() {
        throw new Error("github installations should not be loaded during initialization");
      },
    } as never),
  ]);

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
      "list_github_installations",
      "gh_exec",
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
  } as never, [
    new AgentTerminalToolProvider({
      async getEnvironment() {
        throw new Error("tools should not acquire the environment during cleanup");
      },
    } as never),
    new AgentGithubToolProvider({
      async getEnvironment() {
        throw new Error("tools should not acquire the environment during cleanup");
      },
    } as never, {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during cleanup");
      },
      async listInstallations() {
        throw new Error("github installations should not be loaded during cleanup");
      },
    } as never),
  ]);

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
  } as never, [
    new AgentTerminalToolProvider({
      async getEnvironment() {
        throw new Error("session creation should not eagerly acquire the environment");
      },
    } as never),
    new AgentGithubToolProvider({
      async getEnvironment() {
        throw new Error("session creation should not eagerly acquire the environment");
      },
    } as never, {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during session creation");
      },
      async listInstallations() {
        throw new Error("github installations should not be loaded during session creation");
      },
    } as never),
  ]);

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
      "list_github_installations",
      "gh_exec",
    ],
  );

  session.dispose();
});
