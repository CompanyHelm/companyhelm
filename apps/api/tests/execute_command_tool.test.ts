import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentShellTimeoutError } from "../src/services/agent/compute/shell_interface.ts";
import { AgentExecuteCommandTool } from "../src/services/agent/tools/terminal/execute_command.ts";

test("AgentExecuteCommandTool returns terminal metadata in details", async () => {
  const executeCommand = vi.fn(async () => ({
    completed: true,
    exitCode: 2,
    output: "file-a\nfile-b",
    sessionId: "pty-123",
  }));
  const tool = new AgentExecuteCommandTool({
    async getEnvironment() {
      return {
        executeCommand,
      };
    },
  } as never).createDefinition();

  const result = await tool.execute("tool-call-1", {
    command: "ls -la",
    workingDirectory: "/workspace",
  });

  assert.deepEqual(result.details, {
    command: "ls -la",
    completed: true,
    cwd: "/workspace",
    exitCode: 2,
    sessionId: "pty-123",
    type: "terminal",
  });
  assert.deepEqual(result.content, [{
    text: "file-a\nfile-b",
    type: "text",
  }]);
  assert.deepEqual(executeCommand.mock.calls, [[{
    command: "ls -la",
    workingDirectory: "/workspace",
  }]]);
});

test("AgentExecuteCommandTool logs shell timeouts with the command and rethrows", async () => {
  const timeoutError = new AgentEnvironmentShellTimeoutError(
    "e2b",
    "ss -ltnp | grep ':4000 ' || true",
    30,
    "/workspace/companyhelm-ng",
  );
  const executeCommand = vi.fn(async () => {
    throw timeoutError;
  });
  const warn = vi.fn();
  const tool = new AgentExecuteCommandTool({
    async getEnvironment() {
      return {
        executeCommand,
      };
    },
  } as never, {
    warn,
  } as never).createDefinition();

  await assert.rejects(async () => {
    await tool.execute("tool-call-1", {
      command: "ss -ltnp | grep ':4000 ' || true",
      workingDirectory: "/workspace/companyhelm-ng",
    });
  }, timeoutError);

  assert.equal(warn.mock.calls.length, 1);
  assert.deepEqual(warn.mock.calls[0], [{
    command: "ss -ltnp | grep ':4000 ' || true",
    err: timeoutError,
    provider: "e2b",
    timeoutSeconds: 30,
    workingDirectory: "/workspace/companyhelm-ng",
  }, "environment shell command timed out"]);
});
