import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentComputeDaytonaSandbox } from "../src/services/agent/compute/daytona/daytona_sandbox.ts";

test("AgentComputeDaytonaSandbox materializes lazily and paginates PTY output", async () => {
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

  assert.deepEqual(sandbox.listTools(), [
    "execute_command",
    "send_pty_input",
    "read_pty_output",
    "resize_pty",
    "close_pty",
  ]);
  assert.equal(materializeSandbox.mock.calls.length, 0);

  const execution = await sandbox.executeCommand({
    command: "ls -la",
    yield_time_ms: 0,
  });

  assert.equal(materializeSandbox.mock.calls.length, 1);
  assert.equal(createPty.mock.calls.length, 1);
  assert.equal(sendInput.mock.calls.length, 1);
  assert.equal(sendInput.mock.calls[0]?.[0], "ls -la\n");
  assert.ok(execution.ptyId.length > 0);
  assert.equal(execution.completed, false);

  await onData?.(new TextEncoder().encode("first\n"));
  await onData?.(new TextEncoder().encode("second\n"));

  const firstPage = await sandbox.readPtyOutput(execution.ptyId, null, 1);
  assert.equal(firstPage.chunks.length, 1);
  assert.equal(firstPage.chunks[0]?.text, "first\n");
  assert.equal(firstPage.chunks[0]?.stream, "terminal");

  const secondPage = await sandbox.readPtyOutput(execution.ptyId, firstPage.nextOffset, 1);
  assert.equal(secondPage.chunks.length, 1);
  assert.equal(secondPage.chunks[0]?.text, "second\n");

  const continuedExecution = await sandbox.executeCommand({
    command: "pwd",
    ptyId: execution.ptyId,
    yield_time_ms: 0,
  });
  assert.equal(continuedExecution.ptyId, execution.ptyId);
  assert.equal(createPty.mock.calls.length, 1);
  assert.equal(sendInput.mock.calls[1]?.[0], "pwd\n");

  await sandbox.resizePty(execution.ptyId, 120, 40);
  assert.deepEqual(resize.mock.calls[0], [120, 40]);

  await sandbox.sendPtyInput(execution.ptyId, "exit\n");
  assert.equal(sendInput.mock.calls[2]?.[0], "exit\n");

  await sandbox.closePty(execution.ptyId);
  assert.equal(disconnect.mock.calls.length, 1);
});

test("AgentComputeDaytonaSandbox returns immediately with exit code when the PTY finishes before the yield window", async () => {
  let onData: ((data: Uint8Array) => void | Promise<void>) | null = null;
  const createPty = vi.fn(async (options: {
    onData: (data: Uint8Array) => void | Promise<void>;
  }) => {
    onData = options.onData;

    return {
      disconnect: async () => undefined,
      resize: async () => undefined,
      sendInput: async (data: string | Uint8Array) => {
        assert.equal(data, "echo done\n");
        await onData?.(new TextEncoder().encode("done\n"));
      },
      wait: async () => ({ exitCode: 0 }),
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

  const execution = await sandbox.executeCommand({
    command: "echo done",
    yield_time_ms: 5_000,
  });

  assert.equal(execution.completed, true);
  assert.equal(execution.exitCode, 0);
  assert.equal(execution.output, "done\n");
});
