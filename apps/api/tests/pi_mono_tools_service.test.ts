import assert from "node:assert/strict";
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { test, vi } from "vitest";
import { AgentToolsService } from "../src/services/agent/tools_service.ts";

test("AgentToolsService initializes built-in tools plus compute tools for the current session", () => {
  const computeTool = {
    description: "Execute a sandbox command.",
    execute: async () => ({
      content: [{
        text: "sandbox result",
        type: "text",
      }],
    }),
    label: "execute_command",
    name: "execute_command",
    parameters: {},
    promptGuidelines: [],
    promptSnippet: "Run sandbox commands",
  };
  const service = new AgentToolsService(
    "agent-1",
    {
      listTools() {
        return [computeTool];
      },
    } as never,
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({});
      },
    } as never,
    "session-1",
  );

  const tools = service.initializeTools();

  assert.deepEqual(
    tools.map((tool) => tool.name),
    ["bash", "edit", "read", "write", "execute_command"],
  );
  assert.equal(service.initializeTools(), tools);
});

test("AgentToolsService cleanup invokes sandbox disposal when available", async () => {
  const dispose = vi.fn(async () => undefined);
  const service = new AgentToolsService(
    "agent-1",
    {
      async dispose() {
        await dispose();
      },
      listTools() {
        return [];
      },
    } as never,
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({});
      },
    } as never,
    "session-1",
  );

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

  const service = new AgentToolsService(
    "agent-1",
    {
      listTools() {
        return [{
          description: "Execute a sandbox command.",
          execute: async () => ({
            content: [{
              text: "sandbox result",
              type: "text",
            }],
          }),
          label: "execute_command",
          name: "execute_command",
          parameters: {},
          promptGuidelines: [],
          promptSnippet: "Run sandbox commands",
        }];
      },
    } as never,
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({});
      },
    } as never,
    "session-1",
  );

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
    ["bash", "edit", "read", "write", "execute_command"],
  );

  session.dispose();
});
