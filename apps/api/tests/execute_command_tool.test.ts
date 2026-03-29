import assert from "node:assert/strict";
import { test, vi } from "vitest";
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
