import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test, vi } from "vitest";
import { AgentApplyPatchTool } from "../src/services/agent/tools/terminal/apply_patch.ts";

const execFileAsync = promisify(execFile);

type ToolExecuteFunction = (toolCallId: string, params: unknown) => Promise<{
  content: Array<{ text: string; type: string }>;
  details?: Record<string, unknown>;
}>;

test("AgentApplyPatchTool forwards a structured patch into the environment command runner", async () => {
  const executeCommand = vi.fn(async (input: Record<string, unknown>) => {
    void input;
    return {
      completed: true,
      exitCode: 0,
      output: "M src/file.ts",
      sessionId: "pty-123",
    };
  });
  const tool = new AgentApplyPatchTool({
    async getEnvironment() {
      return {
        executeCommand,
      };
    },
  } as never).createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  const patch = [
    "*** Begin Patch",
    "*** Update File: src/file.ts",
    "@@",
    "-before",
    "+after",
    "*** End Patch",
  ].join("\n");

  const result = await tool.execute("tool-call-1", {
    keepSession: true,
    patch,
    sessionId: "pty-123",
    workingDirectory: "/workspace",
    yield_time_ms: 2000,
  });

  assert.deepEqual(result.details, {
    command: "apply_patch",
    completed: true,
    cwd: "/workspace",
    exitCode: 0,
    sessionId: "pty-123",
    type: "terminal",
  });
  assert.deepEqual(result.content, [{
    text: "M src/file.ts",
    type: "text",
  }]);

  const [commandInput] = executeCommand.mock.calls[0] as [Record<string, unknown>] | undefined ?? [];
  assert.ok(commandInput);
  assert.equal(commandInput.keepSession, true);
  assert.equal(commandInput.sessionId, "pty-123");
  assert.equal(commandInput.workingDirectory, "/workspace");
  assert.equal(commandInput.yield_time_ms, 2000);
  assert.match(commandInput.command as string, /mktemp \/tmp\/companyhelm-apply-patch/);
  assert.match(commandInput.command as string, /command -v node/);
  assert.equal(
    Buffer.from(
      (commandInput.environment as Record<string, string>).COMPANYHELM_APPLY_PATCH_BASE64,
      "base64",
    ).toString("utf8"),
    patch,
  );
});

test("AgentApplyPatchTool generated command applies structured changes inside a workspace", async () => {
  const workspacePath = await mkdtemp(path.join(tmpdir(), "companyhelm-apply-patch-"));
  try {
    await writeFile(path.join(workspacePath, "source.txt"), "before\n");
    await writeFile(path.join(workspacePath, "remove.txt"), "remove me\n");

    const executeCommand = vi.fn(async (input: {
      command: string;
      environment: Record<string, string>;
    }) => {
      try {
        const result = await execFileAsync("sh", ["-lc", input.command], {
          cwd: workspacePath,
          env: {
            ...process.env,
            ...input.environment,
          },
        });
        return {
          completed: true,
          exitCode: 0,
          output: `${result.stdout}${result.stderr}`,
          sessionId: "main",
        };
      } catch (error) {
        const executionError = error as {
          code?: number;
          stderr?: string;
          stdout?: string;
        };
        return {
          completed: true,
          exitCode: executionError.code ?? 1,
          output: `${executionError.stdout ?? ""}${executionError.stderr ?? ""}`,
          sessionId: "main",
        };
      }
    });
    const tool = new AgentApplyPatchTool({
      async getEnvironment() {
        return {
          executeCommand,
        };
      },
    } as never).createDefinition() as unknown as {
      execute: ToolExecuteFunction;
    };

    const patch = [
      "*** Begin Patch",
      "*** Update File: source.txt",
      "*** Move to: renamed.txt",
      "@@",
      "-before",
      "+after",
      "*** Add File: added.txt",
      "+hello",
      "*** Delete File: remove.txt",
      "*** End Patch",
    ].join("\n");

    const result = await tool.execute("tool-call-2", {
      patch,
      workingDirectory: workspacePath,
    });

    assert.equal((result.details as { exitCode: number }).exitCode, 0);
    assert.match((result.content[0] as { text: string }).text, /R source\.txt -> renamed\.txt/);
    assert.match((result.content[0] as { text: string }).text, /A added\.txt/);
    assert.match((result.content[0] as { text: string }).text, /D remove\.txt/);
    assert.equal(await readFile(path.join(workspacePath, "renamed.txt"), "utf8"), "after\n");
    assert.equal(await readFile(path.join(workspacePath, "added.txt"), "utf8"), "hello\n");
    await assert.rejects(async () => readFile(path.join(workspacePath, "source.txt"), "utf8"));
    await assert.rejects(async () => readFile(path.join(workspacePath, "remove.txt"), "utf8"));
  } finally {
    await rm(workspacePath, {
      force: true,
      recursive: true,
    });
  }
});
