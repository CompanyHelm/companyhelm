import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentComputeDaytonaSandbox } from "../src/services/agent/compute/daytona/daytona_sandbox.ts";

test("AgentComputeDaytonaSandbox exposes PI Mono tools and paginates PTY output through them", async () => {
  const sendInput = vi.fn(async () => undefined);
  const resize = vi.fn(async () => undefined);
  const disconnect = vi.fn(async () => undefined);
  const wait = vi.fn(() => new Promise<{ exitCode: number }>(() => undefined));
  let onData: ((data: Uint8Array) => void | Promise<void>) | null = null;
  const createPty = vi.fn(async (options: {
    onData: (data: Uint8Array) => void | Promise<void>;
  }) => {
    onData = options.onData;

    return {
      disconnect,
      kill: async () => undefined,
      resize,
      sendInput,
      wait,
      waitForConnection: async () => undefined,
    };
  });
  const materializeSandbox = vi.fn(async () => ({
    remoteSandbox: {
      process: {
        connectPty: createPty,
        createPty,
      },
    },
    sandboxRecord: {
      id: "sandbox-1",
      status: "running",
    },
  }));
  const sandbox = new AgentComputeDaytonaSandbox(materializeSandbox);
  const tools = sandbox.listTools();
  const executeCommandTool = tools.find((tool) => tool.name === "execute_command");
  const sendPtyInputTool = tools.find((tool) => tool.name === "send_pty_input");
  const readPtyOutputTool = tools.find((tool) => tool.name === "read_pty_output");
  const resizePtyTool = tools.find((tool) => tool.name === "resize_pty");
  const closeSessionTool = tools.find((tool) => tool.name === "close_session");

  assert.deepEqual(tools.map((tool) => tool.name), [
    "execute_command",
    "send_pty_input",
    "read_pty_output",
    "resize_pty",
    "kill_session",
    "close_session",
  ]);
  assert.ok(executeCommandTool);
  assert.ok(sendPtyInputTool);
  assert.ok(readPtyOutputTool);
  assert.ok(resizePtyTool);
  assert.ok(closeSessionTool);
  assert.equal(materializeSandbox.mock.calls.length, 0);

  const executionResult = await executeCommandTool.execute(
    "tool-call-1",
    {
      command: "ls -la",
      yield_time_ms: 0,
    },
    undefined,
    undefined,
  );
  const executionText = (executionResult.content[0] as { text: string }).text;
  const sessionIdMatch = executionText.match(/^sessionId: (.+)$/m);
  const sessionId = sessionIdMatch?.[1];

  assert.ok(sessionId);
  assert.match(executionText, /^completed: false$/m);
  assert.equal(materializeSandbox.mock.calls.length, 1);
  assert.equal(createPty.mock.calls.length, 1);
  assert.equal(sendInput.mock.calls.length, 1);
  assert.match(String(sendInput.mock.calls[0]?.[0]), /^ls -la\nprintf '/);

  await onData?.(new TextEncoder().encode("first\n"));
  await onData?.(new TextEncoder().encode("second\n"));

  const firstPageResult = await readPtyOutputTool.execute(
    "tool-call-2",
    {
      limit: 1,
      sessionId,
    },
    undefined,
    undefined,
  );
  const firstPageText = (firstPageResult.content[0] as { text: string }).text;
  assert.match(firstPageText, /^nextOffset: 0$/m);
  assert.ok(firstPageText.includes("output:\nfirst\n"));

  const secondPageResult = await readPtyOutputTool.execute(
    "tool-call-3",
    {
      afterOffset: 0,
      limit: 1,
      sessionId,
    },
    undefined,
    undefined,
  );
  const secondPageText = (secondPageResult.content[0] as { text: string }).text;
  assert.match(secondPageText, /^nextOffset: 1$/m);
  assert.ok(secondPageText.includes("output:\nsecond\n"));

  await resizePtyTool.execute(
    "tool-call-4",
    {
      columns: 120,
      rows: 40,
      sessionId,
    },
    undefined,
    undefined,
  );
  assert.deepEqual(resize.mock.calls[0], [120, 40]);

  await sendPtyInputTool.execute(
    "tool-call-5",
    {
      input: "exit\n",
      sessionId,
    },
    undefined,
    undefined,
  );
  assert.equal(sendInput.mock.calls[1]?.[0], "exit\n");

  await closeSessionTool.execute(
    "tool-call-6",
    {
      sessionId,
    },
    undefined,
    undefined,
  );
  assert.equal(disconnect.mock.calls.length, 1);
});

test("AgentComputeDaytonaSandbox returns immediately from execute_command when the PTY finishes before the yield window", async () => {
  let onData: ((data: Uint8Array) => void | Promise<void>) | null = null;
  const createPty = vi.fn(async (options: {
    onData: (data: Uint8Array) => void | Promise<void>;
  }) => {
    onData = options.onData;

    return {
      disconnect: async () => undefined,
      kill: async () => undefined,
      resize: async () => undefined,
      sendInput: async (data: string | Uint8Array) => {
        assert.match(String(data), /^echo done\nprintf '/);
        await onData?.(new TextEncoder().encode("done\n"));
        const commandMarker = /\\036(codex_[a-z0-9]+):%s\\037/.exec(String(data));
        assert.ok(commandMarker);
        await onData?.(new TextEncoder().encode(`\u001e${commandMarker[1]}:0\u001f`));
      },
      wait: async () => new Promise(() => undefined),
      waitForConnection: async () => undefined,
    };
  });
  const sandbox = new AgentComputeDaytonaSandbox(async () => ({
    remoteSandbox: {
      process: {
        connectPty: createPty,
        createPty,
      },
    },
    sandboxRecord: {
      id: "sandbox-1",
      status: "running",
    },
  }));
  const executeCommandTool = sandbox.listTools().find((tool) => tool.name === "execute_command");

  assert.ok(executeCommandTool);

  const executionResult = await executeCommandTool.execute(
    "tool-call-1",
    {
      command: "echo done",
      yield_time_ms: 5_000,
    },
    undefined,
    undefined,
  );
  const executionText = (executionResult.content[0] as { text: string }).text;

  assert.match(executionText, /^completed: true$/m);
  assert.match(executionText, /^exitCode: 0$/m);
  assert.ok(executionText.includes("output:\ndone\n"));
});

test("AgentComputeDaytonaSandbox reconnects by session id across handles through the PI Mono tool definitions", async () => {
  const createSendInput = vi.fn(async () => undefined);
  const connectSendInput = vi.fn(async () => undefined);
  const connectKill = vi.fn(async () => undefined);
  const connectPty = vi.fn(async (_sessionId: string, options: {
    onData: (data: Uint8Array) => void | Promise<void>;
  }) => ({
    disconnect: async () => undefined,
    kill: connectKill,
    resize: async () => undefined,
    sendInput: connectSendInput,
    wait: async () => new Promise(() => undefined),
    waitForConnection: async () => {
      await options.onData(new TextEncoder().encode("follow-up\n"));
    },
  }));
  const createPty = vi.fn(async () => ({
    disconnect: async () => undefined,
    kill: async () => undefined,
    resize: async () => undefined,
    sendInput: createSendInput,
    wait: async () => new Promise(() => undefined),
    waitForConnection: async () => undefined,
  }));
  const materializeSandbox = async () => ({
    remoteSandbox: {
      process: {
        connectPty,
        createPty,
      },
    },
    sandboxRecord: {
      id: "sandbox-1",
      status: "running",
    },
  });
  const creatingSandbox = new AgentComputeDaytonaSandbox(materializeSandbox);
  const creatingTools = creatingSandbox.listTools();
  const executeCommandTool = creatingTools.find((tool) => tool.name === "execute_command");
  assert.ok(executeCommandTool);

  const executionResult = await executeCommandTool.execute(
    "tool-call-1",
    {
      command: "tail -f log.txt",
      yield_time_ms: 0,
    },
    undefined,
    undefined,
  );
  const executionText = (executionResult.content[0] as { text: string }).text;
  const sessionId = executionText.match(/^sessionId: (.+)$/m)?.[1];
  const reconnectingSandbox = new AgentComputeDaytonaSandbox(materializeSandbox);
  const reconnectingTools = reconnectingSandbox.listTools();
  const sendPtyInputTool = reconnectingTools.find((tool) => tool.name === "send_pty_input");
  const readPtyOutputTool = reconnectingTools.find((tool) => tool.name === "read_pty_output");
  const killSessionTool = reconnectingTools.find((tool) => tool.name === "kill_session");

  assert.ok(sessionId);
  assert.ok(sendPtyInputTool);
  assert.ok(readPtyOutputTool);
  assert.ok(killSessionTool);

  await sendPtyInputTool.execute(
    "tool-call-2",
    {
      input: "q",
      sessionId,
    },
    undefined,
    undefined,
  );
  const outputResult = await readPtyOutputTool.execute(
    "tool-call-3",
    {
      limit: 10,
      sessionId,
    },
    undefined,
    undefined,
  );
  const outputText = (outputResult.content[0] as { text: string }).text;

  assert.equal(createPty.mock.calls.length, 1);
  assert.equal(connectPty.mock.calls.length, 1);
  assert.equal(connectPty.mock.calls[0]?.[0], sessionId);
  assert.equal(connectSendInput.mock.calls[0]?.[0], "q");
  assert.ok(outputText.includes("output:\nfollow-up\n"));

  await killSessionTool.execute(
    "tool-call-4",
    {
      sessionId,
    },
    undefined,
    undefined,
  );
  assert.equal(connectKill.mock.calls.length, 1);
});
