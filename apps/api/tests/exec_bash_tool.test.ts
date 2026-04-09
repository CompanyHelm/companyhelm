import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentShellTimeoutError } from "../src/services/environments/providers/shell_interface.ts";
import { AgentExecBashTool } from "../src/services/agent/session/pi-mono/tools/terminal/exec_bash.ts";

type ToolExecuteFunction = (toolCallId: string, params: unknown) => Promise<{
  content: Array<{ text: string; type: string }>;
  details?: Record<string, unknown>;
}>;

test("AgentExecBashTool returns bash execution metadata in details", async () => {
  const executeBashCommand = vi.fn(async (input: Record<string, unknown>) => {
    void input;
    return {
      exitCode: 7,
      output: "stdout\nstderr",
    };
  });
  const tool = new AgentExecBashTool({
    async getEnvironment() {
      return {
        executeBashCommand,
      };
    },
  } as never, {} as never).createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  const result = await tool.execute("tool-call-1", {
    command: "printf 'hello'",
    timeoutSeconds: 20,
    workingDirectory: "/workspace",
  });

  assert.deepEqual(result.details, {
    command: "printf 'hello'",
    cwd: "/workspace",
    exitCode: 7,
    timeoutSeconds: 20,
    type: "bash",
  });
  assert.deepEqual(result.content, [{
    text: "stdout\nstderr",
    type: "text",
  }]);
  assert.deepEqual(executeBashCommand.mock.calls, [[{
    command: "printf 'hello'",
    timeoutSeconds: 20,
    workingDirectory: "/workspace",
  }]]);
});

test("AgentExecBashTool logs shell timeouts with the command and rethrows", async () => {
  const timeoutError = new AgentEnvironmentShellTimeoutError(
    "daytona",
    "bash -lc 'sleep 10'",
    10,
    "/workspace",
  );
  const executeBashCommand = vi.fn(async () => {
    throw timeoutError;
  });
  const warn = vi.fn();
  const tool = new AgentExecBashTool({
    async getEnvironment() {
      return {
        executeBashCommand,
      };
    },
  } as never, {
    warn,
  } as never).createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  await assert.rejects(async () => {
    await tool.execute("tool-call-1", {
      command: "sleep 10",
      timeoutSeconds: 10,
      workingDirectory: "/workspace",
    });
  }, timeoutError);

  assert.equal(warn.mock.calls.length, 1);
  assert.deepEqual(warn.mock.calls[0], [{
    command: "bash -lc 'sleep 10'",
    err: timeoutError,
    provider: "daytona",
    timeoutSeconds: 10,
    workingDirectory: "/workspace",
  }, "environment shell command timed out"]);
});
