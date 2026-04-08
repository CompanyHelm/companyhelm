import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentShellTimeoutError } from "../src/services/environments/providers/shell_interface.ts";
import { AgentExecuteCommandTool } from "../src/services/agent/session/pi-mono/tools/terminal/execute_command.ts";

type ToolExecuteFunction = (toolCallId: string, params: unknown) => Promise<{
  content: Array<{ text: string; type: string }>;
  details?: Record<string, unknown>;
}>;

test("AgentExecuteCommandTool returns terminal metadata in details", async () => {
  const executeCommand = vi.fn(async (input: Record<string, unknown>) => {
    void input;
    return {
      completed: true,
      exitCode: 2,
      output: "file-a\nfile-b",
      sessionId: null,
    };
  });
  const tool = new AgentExecuteCommandTool({
    async getEnvironment() {
      return {
        executeCommand,
      };
    },
  } as never, {} as never).createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  const result = await tool.execute("tool-call-1", {
    command: "ls -la",
    workingDirectory: "/workspace",
  });

  assert.deepEqual(result.details, {
    command: "ls -la",
    completed: true,
    cwd: "/workspace",
    exitCode: 2,
    sessionId: null,
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

test("AgentExecuteCommandTool forwards keepSession when requested", async () => {
  const executeCommand = vi.fn(async (input: Record<string, unknown>) => {
    void input;
    return {
      completed: false,
      exitCode: null,
      output: "starting dev server",
      sessionId: "pty-keep",
    };
  });
  const tool = new AgentExecuteCommandTool({
    async getEnvironment() {
      return {
        executeCommand,
      };
    },
  } as never, {} as never).createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  await tool.execute("tool-call-1", {
    command: "npm run dev",
    keepSession: true,
  });

  assert.deepEqual(executeCommand.mock.calls, [[{
    command: "npm run dev",
    keepSession: true,
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
  } as never).createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

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
