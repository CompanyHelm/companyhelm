import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { validateToolArguments } from "@mariozechner/pi-ai";
import { AgentEnvironmentShellTimeoutError } from "../src/services/environments/providers/shell_interface.ts";
import { AgentBashExecTool } from "../src/services/agent/session/pi-mono/tools/terminal/bash_exec.ts";

type ToolExecuteFunction = (toolCallId: string, params: unknown) => Promise<{
  content: Array<{ text: string; type: string }>;
  details?: Record<string, unknown>;
}>;

test("AgentBashExecTool returns bash execution metadata in details", async () => {
  const executeBashCommand = vi.fn(async (input: Record<string, unknown>) => {
    void input;
    return {
      exitCode: 7,
      output: "stdout\nstderr",
    };
  });
  const tool = new AgentBashExecTool({
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

test("AgentBashExecTool logs shell timeouts with the command and rethrows", async () => {
  const timeoutError = new AgentEnvironmentShellTimeoutError(
    "e2b",
    "bash -lc 'sleep 10'",
    10,
    "/workspace",
  );
  const executeBashCommand = vi.fn(async () => {
    throw timeoutError;
  });
  const warn = vi.fn();
  const tool = new AgentBashExecTool({
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
    provider: "e2b",
    timeoutSeconds: 10,
    workingDirectory: "/workspace",
  }, "environment shell command timed out"]);
});

test("AgentBashExecTool rejects timeoutSeconds above 60 during tool argument validation", () => {
  const tool = new AgentBashExecTool({
    async getEnvironment() {
      throw new Error("environment should not be acquired when validation fails");
    },
  } as never, {} as never).createDefinition();

  assert.throws(
    () => validateToolArguments(tool as never, {
      arguments: {
        command: "sleep 61",
        timeoutSeconds: 61,
      },
      id: "tool-call-1",
      name: "bash_exec",
      type: "toolCall",
    }),
    (error) => {
      assert.match(String(error), /timeoutSeconds: must be <= 60/);
      return true;
    },
  );
});

test("AgentBashExecTool rejects timeoutSeconds above 60 during execution", async () => {
  const executeBashCommand = vi.fn();
  const tool = new AgentBashExecTool({
    async getEnvironment() {
      return {
        executeBashCommand,
      };
    },
  } as never, {} as never).createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  await assert.rejects(
    async () => tool.execute("tool-call-1", {
      command: "sleep 61",
      timeoutSeconds: 61,
    }),
    /bash_exec timeoutSeconds cannot exceed 60 seconds\. Use pty_exec for longer-running commands\./,
  );
  assert.equal(executeBashCommand.mock.calls.length, 0);
});
