import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentComputeE2bShell } from "../src/services/environments/providers/e2b/e2b_shell.ts";
import { AgentEnvironmentShellTimeoutError } from "../src/services/environments/providers/shell_interface.ts";

test("AgentComputeE2bShell returns command output on successful execution", async () => {
  const shell = new AgentComputeE2bShell({
    commands: {
      async run(command: string, options: Record<string, unknown>) {
        assert.equal(command, "pwd");
        assert.deepEqual(options, {
          cwd: "/home/user/workspace",
          envs: {
            EXAMPLE: "1",
          },
          timeoutMs: 5_000,
        });
        return {
          exitCode: 0,
          stderr: "",
          stdout: "/home/user/workspace\n",
        };
      },
    },
  } as never);

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

test("AgentComputeE2bShell normalizes non-zero command exits into the shared shell contract", async () => {
  const shell = new AgentComputeE2bShell({
    commands: {
      async run() {
        throw {
          result: {
            exitCode: 127,
            stderr: "/bin/bash: line 1: tmux: command not found\n",
            stdout: "",
          },
        };
      },
    },
  } as never);

  const result = await shell.executeCommand("tmux -V");

  assert.deepEqual(result, {
    exitCode: 127,
    stdout: "/bin/bash: line 1: tmux: command not found\n",
  });
});

test("AgentComputeE2bShell rethrows unexpected sandbox errors", async () => {
  const shell = new AgentComputeE2bShell({
    commands: {
      async run() {
        throw new Error("network down");
      },
    },
  } as never);

  await assert.rejects(
    async () => {
      await shell.executeCommand("pwd");
    },
    /network down/,
  );
});

test("AgentComputeE2bShell throws the shared shell timeout error for E2B request timeouts", async () => {
  const shell = new AgentComputeE2bShell({
    commands: {
      async run() {
        throw new Error("[deadline_exceeded] the operation timed out: This error is likely due to exceeding 'timeoutMs'.");
      },
    },
  } as never);

  await assert.rejects(
    async () => {
      await shell.executeCommand("pwd", "/home/user/workspace", undefined, 30);
    },
    (error: unknown) => {
      assert.ok(error instanceof AgentEnvironmentShellTimeoutError);
      assert.equal(error.provider, "e2b");
      assert.equal(error.command, "pwd");
      assert.equal(error.timeoutSeconds, 30);
      assert.equal(error.workingDirectory, "/home/user/workspace");
      return true;
    },
  );
});
