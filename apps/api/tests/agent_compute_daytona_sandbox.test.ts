import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentComputeDaytonaSandbox } from "../src/services/agent/compute/daytona/daytona_sandbox.ts";

type FakeTmuxSession = {
  createdAt: string;
  height: number;
  output: string;
  width: number;
};

class FakeDaytonaTmuxProcess {
  readonly executeCommand = vi.fn(async (command: string) => {
    if (command.includes("tmux list-sessions")) {
      return {
        exitCode: 0,
        result: [...this.sessions.entries()]
          .map(([sessionId, session]) => `${sessionId}\t0\t${session.createdAt}\t${session.width}\t${session.height}`)
          .join("\n"),
      };
    }

    if (command.startsWith("tmux has-session -t ")) {
      const sessionId = this.extractFirstQuotedValue(command);
      return {
        exitCode: this.sessions.has(sessionId) ? 0 : 1,
        result: "",
      };
    }

    if (command.includes("tmux new-session -d")) {
      const sessionId = /-s '([^']+)'/.exec(command)?.[1];
      assert.ok(sessionId);
      const width = Number(/-x (\d+)/.exec(command)?.[1] ?? "80");
      const height = Number(/-y (\d+)/.exec(command)?.[1] ?? "24");
      this.sessions.set(sessionId, {
        createdAt: "12345",
        height,
        output: "",
        width,
      });

      return {
        exitCode: 0,
        result: "",
      };
    }

    if (command.startsWith("cat > ")) {
      const filePath = this.extractFirstQuotedValue(command);
      const lines = command.split("\n");
      this.commandFiles.set(filePath, lines.slice(1, -1).join("\n"));
      return {
        exitCode: 0,
        result: "",
      };
    }

    if (command.startsWith("rm -f ")) {
      for (const filePath of command.match(/'[^']+'/g) ?? []) {
        const normalizedPath = filePath.slice(1, -1);
        this.commandFiles.delete(normalizedPath);
        this.rcFiles.delete(normalizedPath);
      }

      return {
        exitCode: 0,
        result: "",
      };
    }

    if (command.startsWith("tmux send-keys -t ")) {
      const sessionId = /tmux send-keys -t '([^']+)'/.exec(command)?.[1];
      assert.ok(sessionId);
      const session = this.sessions.get(sessionId);
      assert.ok(session);
      const commandFilePath = command.match(/\/tmp\/companyhelm\/[A-Za-z0-9-]+\.command\.sh/)?.[0];
      const rcFilePath = command.match(/\/tmp\/companyhelm\/[A-Za-z0-9-]+\.rc/)?.[0];

      if (commandFilePath && rcFilePath) {
        const commandFileContents = this.commandFiles.get(commandFilePath) ?? "";
        session.output += `ran: ${commandFileContents.trim()}\n`;
        if (this.autoCompleteCommands) {
          this.rcFiles.set(rcFilePath, "0");
        }
      } else {
        const literalInput = /-l -- '([^']*)'/.exec(command)?.[1] ?? "";
        session.output += literalInput;
        if (command.includes(" Enter")) {
          session.output += "\n";
        }
      }

      return {
        exitCode: 0,
        result: "",
      };
    }

    if (command.startsWith("sh -lc 'if [ -f ")) {
      const filePath = command.match(/\/tmp\/companyhelm\/[A-Za-z0-9-]+\.rc/)?.[0];
      const content = filePath ? (this.rcFiles.get(filePath) ?? "") : "";
      return {
        exitCode: 0,
        result: content,
      };
    }

    if (command.startsWith("tmux capture-pane -pt ")) {
      const sessionId = this.extractFirstQuotedValue(command);
      const session = this.sessions.get(sessionId);
      return {
        exitCode: session ? 0 : 1,
        result: session?.output ?? "",
      };
    }

    if (command.startsWith("tmux resize-window -t ")) {
      const sessionId = this.extractFirstQuotedValue(command);
      const session = this.sessions.get(sessionId);
      assert.ok(session);
      session.width = Number(/-x (\d+)/.exec(command)?.[1] ?? "80");
      session.height = Number(/-y (\d+)/.exec(command)?.[1] ?? "24");
      return {
        exitCode: 0,
        result: "",
      };
    }

    if (command.startsWith("tmux kill-session -t ")) {
      const sessionId = this.extractFirstQuotedValue(command);
      this.sessions.delete(sessionId);
      return {
        exitCode: 0,
        result: "",
      };
    }

    throw new Error(`Unhandled sandbox command: ${command}`);
  });

  readonly commandFiles = new Map<string, string>();
  readonly rcFiles = new Map<string, string>();
  readonly sessions = new Map<string, FakeTmuxSession>();
  autoCompleteCommands = false;

  private extractFirstQuotedValue(command: string): string {
    const match = /'([^']+)'/.exec(command);
    assert.ok(match);
    return match[1];
  }
}

test("AgentComputeDaytonaSandbox exposes tmux-backed tools and reads output directly from tmux", async () => {
  const fakeProcess = new FakeDaytonaTmuxProcess();
  fakeProcess.sessions.set("stray-session", {
    createdAt: "67890",
    height: 24,
    output: "stray output",
    width: 80,
  });
  const release = vi.fn(async () => undefined);
  const sandbox = new AgentComputeDaytonaSandbox(async () => ({
    release,
    remoteSandbox: {
      process: fakeProcess,
    },
    sandboxRecord: {
      id: "sandbox-1",
      status: "running",
    },
  }));
  const tools = sandbox.listTools();
  const executeCommandTool = tools.find((tool) => tool.name === "execute_command");
  const readPtyOutputTool = tools.find((tool) => tool.name === "read_pty_output");
  const resizePtyTool = tools.find((tool) => tool.name === "resize_pty");
  const closeSessionTool = tools.find((tool) => tool.name === "close_session");
  const listPtySessionsTool = tools.find((tool) => tool.name === "list_pty_sessions");

  assert.deepEqual(tools.map((tool) => tool.name), [
    "list_pty_sessions",
    "execute_command",
    "send_pty_input",
    "read_pty_output",
    "resize_pty",
    "kill_session",
    "close_session",
  ]);
  assert.ok(executeCommandTool);
  assert.ok(readPtyOutputTool);
  assert.ok(resizePtyTool);
  assert.ok(closeSessionTool);
  assert.ok(listPtySessionsTool);

  const executionResult = await executeCommandTool.execute(
    "tool-call-1",
    {
      command: "ls -la",
      yield_time_ms: 0,
    },
    undefined,
    undefined,
  );
  const executionText = (executionResult.content[0] as { text: string }).text;
  const sessionId = executionText.match(/^sessionId: (.+)$/m)?.[1];

  assert.ok(sessionId);
  assert.match(executionText, /^completed: false$/m);
  assert.ok(executionText.includes("output:\nran: ls -la\n"));

  const listResult = await listPtySessionsTool.execute(
    "tool-call-2",
    {},
    undefined,
    undefined,
  );
  const listText = (listResult.content[0] as { text: string }).text;
  assert.ok(listText.includes(`sessionId: ${sessionId}`));
  assert.ok(!listText.includes("stray-session"));

  const firstReadResult = await readPtyOutputTool.execute(
    "tool-call-3",
    {
      limit: 4_000,
      sessionId,
    },
    undefined,
    undefined,
  );
  const firstReadText = (firstReadResult.content[0] as { text: string }).text;
  const nextOffset = Number(firstReadText.match(/^nextOffset: (\d+)$/m)?.[1] ?? "0");
  assert.ok(firstReadText.includes("output:\nran: ls -la\n"));

  const secondReadResult = await readPtyOutputTool.execute(
    "tool-call-4",
    {
      afterOffset: nextOffset,
      limit: 4_000,
      sessionId,
    },
    undefined,
    undefined,
  );
  const secondReadText = (secondReadResult.content[0] as { text: string }).text;
  assert.ok(secondReadText.includes("output:\n(no output)"));

  await resizePtyTool.execute(
    "tool-call-5",
    {
      columns: 120,
      rows: 40,
      sessionId,
    },
    undefined,
    undefined,
  );
  assert.equal(fakeProcess.sessions.get(sessionId)?.width, 120);
  assert.equal(fakeProcess.sessions.get(sessionId)?.height, 40);

  await closeSessionTool.execute(
    "tool-call-6",
    {
      sessionId,
    },
    undefined,
    undefined,
  );
  assert.equal(fakeProcess.sessions.has(sessionId), false);

  await sandbox.dispose();
  assert.equal(release.mock.calls.length, 1);
});

test("AgentComputeDaytonaSandbox returns immediately from execute_command when the tmux command completes before the yield window", async () => {
  const fakeProcess = new FakeDaytonaTmuxProcess();
  fakeProcess.autoCompleteCommands = true;
  const sandbox = new AgentComputeDaytonaSandbox(async () => ({
    release: async () => undefined,
    remoteSandbox: {
      process: fakeProcess,
    },
    sandboxRecord: {
      id: "sandbox-1",
      status: "running",
    },
  }));
  const executeCommandTool = sandbox.listTools().find((tool) => tool.name === "execute_command");

  assert.ok(executeCommandTool);

  const executionResult = await executeCommandTool.execute(
    "tool-call-1",
    {
      command: "echo done",
      yield_time_ms: 5_000,
    },
    undefined,
    undefined,
  );
  const executionText = (executionResult.content[0] as { text: string }).text;

  assert.match(executionText, /^completed: true$/m);
  assert.match(executionText, /^exitCode: 0$/m);
  assert.ok(executionText.includes("output:\nran: echo done\n"));
});

test("AgentComputeDaytonaSandbox reuses tmux sessions by session id across sandbox handles", async () => {
  const fakeProcess = new FakeDaytonaTmuxProcess();
  const materializeSandbox = async () => ({
    release: async () => undefined,
    remoteSandbox: {
      process: fakeProcess,
    },
    sandboxRecord: {
      id: "sandbox-1",
      status: "running",
    },
  });
  const creatingSandbox = new AgentComputeDaytonaSandbox(materializeSandbox);
  const executeCommandTool = creatingSandbox.listTools().find((tool) => tool.name === "execute_command");

  assert.ok(executeCommandTool);

  const executionResult = await executeCommandTool.execute(
    "tool-call-1",
    {
      command: "tail -f log.txt",
      yield_time_ms: 0,
    },
    undefined,
    undefined,
  );
  const executionText = (executionResult.content[0] as { text: string }).text;
  const sessionId = executionText.match(/^sessionId: (.+)$/m)?.[1];
  const reconnectingSandbox = new AgentComputeDaytonaSandbox(materializeSandbox);
  const reconnectingTools = reconnectingSandbox.listTools();
  const sendPtyInputTool = reconnectingTools.find((tool) => tool.name === "send_pty_input");
  const readPtyOutputTool = reconnectingTools.find((tool) => tool.name === "read_pty_output");
  const killSessionTool = reconnectingTools.find((tool) => tool.name === "kill_session");

  assert.ok(sessionId);
  assert.ok(sendPtyInputTool);
  assert.ok(readPtyOutputTool);
  assert.ok(killSessionTool);

  await sendPtyInputTool.execute(
    "tool-call-2",
    {
      input: "q\n",
      sessionId,
      yield_time_ms: 0,
    },
    undefined,
    undefined,
  );
  const outputResult = await readPtyOutputTool.execute(
    "tool-call-3",
    {
      limit: 4_000,
      sessionId,
    },
    undefined,
    undefined,
  );
  const outputText = (outputResult.content[0] as { text: string }).text;

  assert.ok(outputText.includes("output:\nran: tail -f log.txt\nq\n"));

  await killSessionTool.execute(
    "tool-call-4",
    {
      sessionId,
    },
    undefined,
    undefined,
  );
  assert.equal(fakeProcess.sessions.has(sessionId), false);
});
