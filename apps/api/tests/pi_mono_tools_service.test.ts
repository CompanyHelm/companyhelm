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
  assert.equal(tools.length, 4);
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ["bash", "edit", "read", "write"],
  );

  const readTool = tools.find((tool) => tool.name === "read");
  assert.ok(readTool);
  const result = await readTool.execute(
    "tool-call-1",
    {
      path: "src/index.ts",
      limit: 20,
      offset: 5,
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
    limit: 20,
    offset: 5,
    path: "src/index.ts",
    sessionId: "session-1",
    transactionProviderAvailable: true,
  });
});

test("PiMonoToolsService returns stubbed bash, edit, and write overrides", async () => {
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
  const bashTool = tools.find((tool) => tool.name === "bash");
  const editTool = tools.find((tool) => tool.name === "edit");
  const writeTool = tools.find((tool) => tool.name === "write");
  assert.ok(bashTool);
  assert.ok(editTool);
  assert.ok(writeTool);

  const bashResult = await bashTool.execute(
    "tool-call-1",
    {
      command: "npm test",
      timeout: 30_000,
    },
    undefined,
    undefined,
  );
  const editResult = await editTool.execute(
    "tool-call-2",
    {
      newText: "new body",
      oldText: "old body",
      path: "src/index.ts",
    },
    undefined,
    undefined,
  );
  const writeResult = await writeTool.execute(
    "tool-call-3",
    {
      content: "file contents",
      path: "src/output.ts",
    },
    undefined,
    undefined,
  );

  assert.deepEqual(bashResult.content, [{
    type: "text",
    text: "Stub bash result for \"npm test\" in session session-1 on agent agent-1.",
  }]);
  assert.deepEqual(editResult.content, [{
    type: "text",
    text: "Stub edit result for \"src/index.ts\" in session session-1 on agent agent-1.",
  }]);
  assert.deepEqual(writeResult.content, [{
    type: "text",
    text: "Stub write result for \"src/output.ts\" in session session-1 on agent agent-1.",
  }]);
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

  assert.deepEqual(
    session.agent.state.tools.map((tool) => tool.name),
    ["read", "bash", "edit", "write"],
  );

  const readTool = session.agent.state.tools.find((tool) => tool.name === "read");
  const bashTool = session.agent.state.tools.find((tool) => tool.name === "bash");
  const editTool = session.agent.state.tools.find((tool) => tool.name === "edit");
  const writeTool = session.agent.state.tools.find((tool) => tool.name === "write");
  assert.ok(readTool);
  assert.ok(bashTool);
  assert.ok(editTool);
  assert.ok(writeTool);

  const readResult = await readTool.execute(
    "tool-call-1",
    {
      path: "src/index.ts",
    },
  );
  const bashResult = await bashTool.execute(
    "tool-call-2",
    {
      command: "pwd",
    },
  );
  const editResult = await editTool.execute(
    "tool-call-3",
    {
      newText: "next",
      oldText: "prev",
      path: "src/index.ts",
    },
  );
  const writeResult = await writeTool.execute(
    "tool-call-4",
    {
      content: "hello",
      path: "src/output.ts",
    },
  );

  assert.deepEqual(readResult.content, [{
    type: "text",
    text: "Stub read result for \"src/index.ts\" in session session-1 on agent agent-1.",
  }]);
  assert.deepEqual(bashResult.content, [{
    type: "text",
    text: "Stub bash result for \"pwd\" in session session-1 on agent agent-1.",
  }]);
  assert.deepEqual(editResult.content, [{
    type: "text",
    text: "Stub edit result for \"src/index.ts\" in session session-1 on agent agent-1.",
  }]);
  assert.deepEqual(writeResult.content, [{
    type: "text",
    text: "Stub write result for \"src/output.ts\" in session session-1 on agent agent-1.",
  }]);

  session.dispose();
});
