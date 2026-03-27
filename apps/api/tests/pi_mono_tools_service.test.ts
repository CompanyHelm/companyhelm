import assert from "node:assert/strict";
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { test } from "vitest";
import { PiMonoToolsService } from "../src/services/agent/session/pi-mono/tools/service.ts";

test("PiMonoToolsService returns a stubbed read override bound to the current session", async () => {
  const service = new PiMonoToolsService(
    "agent-1",
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({});
      },
    } as never,
    "session-1",
  );

  const tools = service.getTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0]?.name, "read");

  const result = await tools[0]!.execute(
    "tool-call-1",
    {
      path: "src/index.ts",
    },
    undefined,
    undefined,
  );

  assert.deepEqual(result.content, [{
    type: "text",
    text: "Stub read result for \"src/index.ts\" in session session-1 on agent agent-1.",
  }]);
  assert.deepEqual(result.details, {
    agentId: "agent-1",
    path: "src/index.ts",
    sessionId: "session-1",
    transactionProviderAvailable: true,
  });
});

test("PiMono read override replaces the built-in read tool in a live session", async () => {
  const authStorage = AuthStorage.inMemory();
  authStorage.setRuntimeApiKey("openai", "sk-test");
  const modelRegistry = new ModelRegistry(authStorage);
  const model = modelRegistry.find("openai", "gpt-5.4");
  if (!model) {
    throw new Error("Model not found.");
  }

  const service = new PiMonoToolsService(
    "agent-1",
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

  const { session } = await createAgentSession({
    authStorage,
    customTools: service.getTools(),
    model,
    modelRegistry,
    sessionManager,
    thinkingLevel: "low",
  });

  const readTool = session.agent.state.tools.find((tool) => tool.name === "read");
  assert.ok(readTool);

  const result = await readTool.execute(
    "tool-call-1",
    {
      path: "src/index.ts",
    },
  );

  assert.deepEqual(result.content, [{
    type: "text",
    text: "Stub read result for \"src/index.ts\" in session session-1 on agent agent-1.",
  }]);

  session.dispose();
});
