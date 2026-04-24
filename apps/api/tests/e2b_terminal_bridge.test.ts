import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { Sandbox } from "e2b";
import { EnvironmentE2bTerminalBridge } from "../src/services/environments/terminal/e2b_terminal_bridge.ts";

test("EnvironmentE2bTerminalBridge opens PTYs as the sandbox user", async () => {
  const create = vi.fn(async () => ({
    kill: vi.fn(async () => true),
    pid: 42,
    wait: vi.fn(async () => ({
      exitCode: 0,
      stderr: "",
      stdout: "",
    })),
  }));
  const sendInput = vi.fn(async () => undefined);
  const resize = vi.fn(async () => undefined);
  const connect = vi.spyOn(Sandbox, "connect").mockResolvedValue({
    pty: {
      create,
      resize,
      sendInput,
    },
  } as never);

  const bridge = new EnvironmentE2bTerminalBridge({
    async loadRuntimeDefinitionById() {
      return {
        apiKey: "test-api-key",
        companyId: "company-id",
        description: null,
        id: "definition-id",
        name: "E2B",
        provider: "e2b" as const,
      };
    },
  } as never);

  await bridge.open({
    columns: 120,
    environment: {
      companyId: "company-id",
      provider: "e2b",
      providerDefinitionId: "definition-id",
      providerEnvironmentId: "sandbox-id",
    } as never,
    onOutput: () => undefined,
    rows: 40,
    terminalSessionId: "terminal-session-id",
    transactionProvider: {} as never,
  });

  assert.equal(connect.mock.calls.length, 1);
  assert.deepEqual(create.mock.calls[0]?.[0], {
    cols: 120,
    onData: create.mock.calls[0]?.[0]?.onData,
    rows: 40,
    timeoutMs: 0,
    user: "user",
  });
  assert.equal(typeof create.mock.calls[0]?.[0]?.onData, "function");
  assert.equal(sendInput.mock.calls.length, 1);
  assert.equal(resize.mock.calls.length, 0);
});
