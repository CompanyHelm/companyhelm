import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentEnvironmentTmuxPty } from "../src/services/agent/compute/tmux_pty.ts";

type FakeTmuxSession = {
  createdAt: string;
  height: number;
  output: string;
  width: number;
};

class FakeEnvironmentShell {
  readonly commandFiles = new Map<string, string>();
  readonly rcFiles = new Map<string, string>();
  readonly sessions = new Map<string, FakeTmuxSession>();
  autoCompleteCommands = false;
  listedSessionsOutput: string | null = null;

  async executeCommand(command: string) {
    if (command.includes("command -v tmux")) {
      return {
        exitCode: 0,
        stdout: "",
      };
    }

    if (command.includes("tmux list-sessions")) {
      if (typeof this.listedSessionsOutput === "string") {
        return {
          exitCode: 0,
          stdout: this.listedSessionsOutput,
        };
      }

      return {
        exitCode: 0,
        stdout: [...this.sessions.entries()]
          .map(([sessionId, session]) => `${sessionId}\t0\t${session.createdAt}\t${session.width}\t${session.height}`)
          .join("\n"),
      };
    }

    if (command.startsWith("tmux has-session -t ")) {
      const sessionId = this.extractFirstQuotedValue(command);
      return {
        exitCode: this.sessions.has(sessionId) ? 0 : 1,
        stdout: "",
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
        stdout: "",
      };
    }

    if (command.startsWith("cat > ")) {
      const filePath = this.extractFirstQuotedValue(command);
      const lines = command.split("\n");
      this.commandFiles.set(filePath, lines.slice(1, -1).join("\n"));
      return {
        exitCode: 0,
        stdout: "",
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
        stdout: "",
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
        const commandLines = commandFileContents
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => {
            return line.length > 0
              && !line.startsWith("cd ")
              && !line.startsWith("export ")
              && !line.startsWith("printf '%s\\n' '__COMPANYHELM_OUTPUT_START_")
              && !line.startsWith("printf '\\n%s\\n' '__COMPANYHELM_OUTPUT_END_");
          });
        const commandOutput = commandLines.join("\n");
        const outputStartMarker = commandFileContents.match(/__COMPANYHELM_OUTPUT_START_[A-Za-z0-9]+__/)?.[0];
        const outputEndMarker = commandFileContents.match(/__COMPANYHELM_OUTPUT_END_[A-Za-z0-9]+__/)?.[0];

        session.output += "wrapper command that should be hidden\n";
        if (outputStartMarker) {
          session.output += `${outputStartMarker}\n`;
        }
        if (commandOutput.length > 0) {
          session.output += `ran: ${commandOutput}\n\n\n`;
        }
        if (this.autoCompleteCommands) {
          if (outputEndMarker) {
            session.output += `${outputEndMarker}\n\n`;
          }
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
        stdout: "",
      };
    }

    if (command.startsWith("sh -lc 'if [ -f ")) {
      const filePath = command.match(/\/tmp\/companyhelm\/[A-Za-z0-9-]+\.rc/)?.[0];
      const content = filePath ? (this.rcFiles.get(filePath) ?? "") : "";
      return {
        exitCode: 0,
        stdout: content,
      };
    }

    if (command.startsWith("tmux capture-pane -pt ")) {
      const sessionId = this.extractFirstQuotedValue(command);
      const session = this.sessions.get(sessionId);
      return {
        exitCode: session ? 0 : 1,
        stdout: session?.output ?? "",
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
        stdout: "",
      };
    }

    if (command.startsWith("tmux kill-session -t ")) {
      const sessionId = this.extractFirstQuotedValue(command);
      this.sessions.delete(sessionId);
      return {
        exitCode: 0,
        stdout: "",
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

test("AgentEnvironmentTmuxPty executes commands, reads tmux output, and resizes sessions", async () => {
  const fakeEnvironmentShell = new FakeEnvironmentShell();
  fakeEnvironmentShell.sessions.set("stray-session", {
    createdAt: "67890",
    height: 24,
    output: "stray output",
    width: 80,
  });
  const pty = new AgentEnvironmentTmuxPty(fakeEnvironmentShell);

  const executionResult = await pty.executeCommand({
    command: "ls -la",
    yield_time_ms: 0,
  });

  assert.equal(executionResult.sessionId, "main");
  assert.equal(executionResult.completed, false);
  assert.equal(executionResult.output, "ran: ls -la");

  const sessions = await pty.listSessions();
  assert.ok(sessions.some((session) => session.id === executionResult.sessionId));
  assert.ok(sessions.some((session) => session.id === "stray-session"));

  const firstPage = await pty.readOutput(executionResult.sessionId, null, 4_000);
  assert.equal(firstPage.chunks.length, 1);
  assert.ok(firstPage.chunks[0]?.text.includes("wrapper command that should be hidden"));
  assert.ok(firstPage.chunks[0]?.text.includes("ran: ls -la"));

  const secondPage = await pty.readOutput(executionResult.sessionId, firstPage.nextOffset, 4_000);
  assert.deepEqual(secondPage.chunks, []);

  await pty.resizeSession(executionResult.sessionId, 120, 40);
  assert.equal(fakeEnvironmentShell.sessions.get(executionResult.sessionId)?.width, 120);
  assert.equal(fakeEnvironmentShell.sessions.get(executionResult.sessionId)?.height, 40);

  await pty.closeSession(executionResult.sessionId);
  assert.equal(fakeEnvironmentShell.sessions.has(executionResult.sessionId), false);
});

test("AgentEnvironmentTmuxPty returns immediately when a tmux command completes before the yield window", async () => {
  const fakeEnvironmentShell = new FakeEnvironmentShell();
  fakeEnvironmentShell.autoCompleteCommands = true;
  const pty = new AgentEnvironmentTmuxPty(fakeEnvironmentShell);

  const result = await pty.executeCommand({
    command: "echo done",
    yield_time_ms: 5_000,
  });

  assert.equal(result.completed, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.output, "ran: echo done");
});

test("AgentEnvironmentTmuxPty uses the provided logical session name when creating tmux sessions", async () => {
  const fakeEnvironmentShell = new FakeEnvironmentShell();
  const pty = new AgentEnvironmentTmuxPty(fakeEnvironmentShell);

  const result = await pty.executeCommand({
    command: "npm run dev",
    sessionId: "web",
    yield_time_ms: 0,
  });

  assert.equal(result.sessionId, "web");
  assert.ok(fakeEnvironmentShell.sessions.has("web"));
});

test("AgentEnvironmentTmuxPty reuses tmux sessions by session id across PTY instances", async () => {
  const fakeEnvironmentShell = new FakeEnvironmentShell();
  const firstPty = new AgentEnvironmentTmuxPty(fakeEnvironmentShell);
 

  const createdSession = await firstPty.executeCommand({
    command: "tail -f log.txt",
    yield_time_ms: 0,
  });
  const secondPty = new AgentEnvironmentTmuxPty(fakeEnvironmentShell);

  await secondPty.sendInput(createdSession.sessionId, "q\n", 0);
  const outputPage = await secondPty.readOutput(createdSession.sessionId, null, 4_000);

  assert.ok(outputPage.chunks[0]?.text.includes("ran: tail -f log.txt"));
  assert.ok(outputPage.chunks[0]?.text.includes("q\n"));

  await secondPty.killSession(createdSession.sessionId);
  assert.equal(fakeEnvironmentShell.sessions.has(createdSession.sessionId), false);
});

test("AgentEnvironmentTmuxPty parses flattened tmux session listings into reusable session ids", async () => {
  const fakeEnvironmentShell = new FakeEnvironmentShell();
  fakeEnvironmentShell.listedSessionsOutput = "pty-22ffc1cb214c4c0791235fd457e2d415_0_1774825845_80_20";
  const pty = new AgentEnvironmentTmuxPty(fakeEnvironmentShell);

  const sessions = await pty.listSessions();

  assert.deepEqual(sessions, [{
    attached: false,
    createdAt: "1774825845",
    height: 20,
    id: "pty-22ffc1cb214c4c0791235fd457e2d415",
    width: 80,
  }]);
});
