import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentComputeDaytonaShell } from "../src/services/agent/compute/daytona/daytona_shell.ts";

test("AgentComputeDaytonaShell returns command output on successful execution", async () => {
  const shell = new AgentComputeDaytonaShell({
    process: {
      async executeCommand(command: string, cwd?: string, env?: Record<string, string>, timeout?: number) {
        assert.equal(command, "pwd");
        assert.equal(cwd, "/home/user/workspace");
        assert.deepEqual(env, {
          EXAMPLE: "1",
        });
        assert.equal(timeout, 5);
        return {
          artifacts: {
            stdout: "/home/user/workspace\n",
          },
          exitCode: 0,
          result: "",
        };
      },
    },
  });

  const result = await shell.executeCommand(
    "pwd",
    "/home/user/workspace",
    {
      EXAMPLE: "1",
    },
    5,
  );

  assert.deepEqual(result, {
    exitCode: 0,
    stdout: "/home/user/workspace\n",
  });
});

test("AgentComputeDaytonaShell warns when the Daytona command request times out", async () => {
  const warn = vi.fn();
  const shell = new AgentComputeDaytonaShell({
    process: {
      async executeCommand() {
        throw new Error("request timed out while waiting for process execution");
      },
    },
  }, {
    warn,
  });

  await assert.rejects(
    async () => {
      await shell.executeCommand("pwd", "/home/user/workspace", undefined, 30);
    },
    /timed out/,
  );

  assert.equal(warn.mock.calls.length, 1);
  assert.equal(warn.mock.calls[0]?.[1], "daytona shell command timed out");
});
