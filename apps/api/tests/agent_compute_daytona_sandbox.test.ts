import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentComputeDaytonaEnvironment } from "../src/services/agent/compute/daytona/daytona_environment.ts";

type FakeTmuxSession = {
  createdAt: string;
  height: number;
  output: string;
  width: number;
};

class FakeDaytonaTmuxProcess {
  readonly commandFiles = new Map<string, string>();
  readonly rcFiles = new Map<string, string>();
  readonly sessions = new Map<string, FakeTmuxSession>();
  autoCompleteCommands = false;

  async executeCommand(command: string) {
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
  }

  private extractFirstQuotedValue(command: string): string {
    const match = /'([^']+)'/.exec(command);
    assert.ok(match);
    return match[1];
  }
}

test("AgentComputeDaytonaEnvironment executes commands, reads tmux output, and resizes sessions", async () => {
  const fakeProcess = new FakeDaytonaTmuxProcess();
  fakeProcess.sessions.set("stray-session", {
    createdAt: "67890",
    height: 24,
    output: "stray output",
    width: 80,
  });
  const environment = new AgentComputeDaytonaEnvironment({
    process: fakeProcess,
  });

  const executionResult = await environment.executeCommand({
    command: "ls -la",
    yield_time_ms: 0,
  });

  assert.ok(executionResult.sessionId.startsWith("pty-"));
  assert.equal(executionResult.completed, false);
  assert.ok(executionResult.output.includes("ran: ls -la\n"));

  const sessions = await environment.listSessions();
  assert.ok(sessions.some((session) => session.id === executionResult.sessionId));
  assert.ok(sessions.some((session) => session.id === "stray-session"));

  const firstPage = await environment.readOutput(executionResult.sessionId, null, 4_000);
  assert.equal(firstPage.chunks.length, 1);
  assert.ok(firstPage.chunks[0]?.text.includes("ran: ls -la\n"));

  const secondPage = await environment.readOutput(executionResult.sessionId, firstPage.nextOffset, 4_000);
  assert.deepEqual(secondPage.chunks, []);

  await environment.resizeSession(executionResult.sessionId, 120, 40);
  assert.equal(fakeProcess.sessions.get(executionResult.sessionId)?.width, 120);
  assert.equal(fakeProcess.sessions.get(executionResult.sessionId)?.height, 40);

  await environment.closeSession(executionResult.sessionId);
  assert.equal(fakeProcess.sessions.has(executionResult.sessionId), false);
});

test("AgentComputeDaytonaEnvironment returns immediately when a tmux command completes before the yield window", async () => {
  const fakeProcess = new FakeDaytonaTmuxProcess();
  fakeProcess.autoCompleteCommands = true;
  const environment = new AgentComputeDaytonaEnvironment({
    process: fakeProcess,
  });

  const result = await environment.executeCommand({
    command: "echo done",
    yield_time_ms: 5_000,
  });

  assert.equal(result.completed, true);
  assert.equal(result.exitCode, 0);
  assert.ok(result.output.includes("ran: echo done\n"));
});

test("AgentComputeDaytonaEnvironment reuses tmux sessions by session id across runtime instances", async () => {
  const fakeProcess = new FakeDaytonaTmuxProcess();
  const firstRuntime = new AgentComputeDaytonaEnvironment({
    process: fakeProcess,
  });

  const createdSession = await firstRuntime.executeCommand({
    command: "tail -f log.txt",
    yield_time_ms: 0,
  });
  const secondRuntime = new AgentComputeDaytonaEnvironment({
    process: fakeProcess,
  });

  await secondRuntime.sendInput(createdSession.sessionId, "q\n", 0);
  const outputPage = await secondRuntime.readOutput(createdSession.sessionId, null, 4_000);

  assert.ok(outputPage.chunks[0]?.text.includes("ran: tail -f log.txt\nq\n"));

  await secondRuntime.killSession(createdSession.sessionId);
  assert.equal(fakeProcess.sessions.has(createdSession.sessionId), false);
});
