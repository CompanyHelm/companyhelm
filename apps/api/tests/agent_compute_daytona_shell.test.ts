import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentComputeDaytonaShell } from "../src/services/agent/compute/daytona/daytona_shell.ts";
import { AgentEnvironmentShellTimeoutError } from "../src/services/agent/compute/shell_interface.ts";

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

test("AgentComputeDaytonaShell throws the shared shell timeout error for Daytona request timeouts", async () => {
  const shell = new AgentComputeDaytonaShell({
    process: {
      async executeCommand() {
        throw new Error("request timed out while waiting for process execution");
      },
    },
  });

  await assert.rejects(
    async () => {
      await shell.executeCommand("pwd", "/home/user/workspace", undefined, 30);
    },
    (error: unknown) => {
      assert.ok(error instanceof AgentEnvironmentShellTimeoutError);
      assert.equal(error.provider, "daytona");
      assert.equal(error.command, "pwd");
      assert.equal(error.timeoutSeconds, 30);
      assert.equal(error.workingDirectory, "/home/user/workspace");
      return true;
    },
  );
});
