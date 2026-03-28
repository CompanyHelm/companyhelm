import { randomUUID } from "node:crypto";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type {
  AgentComputeCommandInput,
  AgentComputeCommandResult,
  AgentComputePtyOutputPage,
} from "../sandbox_interface.ts";
import { AgentComputeSandboxInterface } from "../sandbox_interface.ts";

type MaterializedDaytonaSandbox = {
  environmentRecord: {
    id: string;
    status: string;
  };
  release: () => Promise<void>;
  remoteSandbox: {
    process: {
      executeCommand(
        command: string,
        cwd?: string,
        env?: Record<string, string>,
        timeout?: number,
      ): Promise<{
        artifacts?: {
          stdout?: string;
        };
        exitCode: number;
        result: string;
      }>;
    };
  };
};

type TmuxCommandRun = {
  rcFile: string;
};

type TmuxSessionInfo = {
  attached: boolean;
  createdAt: string;
  height: number;
  id: string;
  width: number;
};

/**
 * Adapts a lazily materialized Daytona sandbox into a tmux-backed PI Mono tool surface. Every
 * runtime-local compute session maps to a remote tmux session inside the sandbox, so follow-up
 * tool calls can address the same shell by session id without keeping PTY output buffered in the
 * API process.
 */
export class AgentComputeDaytonaSandbox extends AgentComputeSandboxInterface {
  private static readonly DEFAULT_EXECUTE_COMMAND_YIELD_MS = 1_000;
  private static readonly DEFAULT_READ_OUTPUT_LIMIT = 4_000;
  private static readonly POLL_INTERVAL_MILLISECONDS = 100;
  private static readonly REMOTE_COMMAND_TIMEOUT_SECONDS = 30;
  private static readonly STATE_DIRECTORY = "/tmp/companyhelm";
  private static readonly listPtySessionsParameters = Type.Object({});
  private static readonly executeCommandParameters = Type.Object({
    columns: Type.Optional(Type.Number({
      description: "Optional terminal width to use when creating a new session.",
    })),
    command: Type.String({
      description: "Shell command to execute inside the sandbox tmux session.",
    }),
    environment: Type.Optional(Type.Record(
      Type.String(),
      Type.String(),
      {
        description: "Optional environment variables to apply for this command execution.",
      },
    )),
    rows: Type.Optional(Type.Number({
      description: "Optional terminal height to use when creating a new session.",
    })),
    sessionId: Type.Optional(Type.String({
      description: "Existing sandbox session id to reuse for follow-up commands.",
    })),
    workingDirectory: Type.Optional(Type.String({
      description: "Optional working directory to use for this command execution.",
    })),
    yield_time_ms: Type.Optional(Type.Number({
      description: "How long to wait for output before returning control, in milliseconds.",
    })),
  });
  private static readonly sendPtyInputParameters = Type.Object({
    input: Type.String({
      description: "Raw terminal input to write into the running sandbox tmux session.",
    }),
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
    yield_time_ms: Type.Optional(Type.Number({
      description: "How long to wait for output before returning control, in milliseconds.",
    })),
  });
  private static readonly readPtyOutputParameters = Type.Object({
    afterOffset: Type.Optional(Type.Number({
      description: "Character offset cursor returned by the previous read. Omit for the first page.",
    })),
    limit: Type.Optional(Type.Number({
      description: "Maximum number of characters to return from the tmux pane capture.",
    })),
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
  });
  private static readonly resizePtyParameters = Type.Object({
    columns: Type.Number({
      description: "Target terminal width in columns.",
    }),
    rows: Type.Number({
      description: "Target terminal height in rows.",
    }),
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
  });
  private static readonly killSessionParameters = Type.Object({
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
  });
  private static readonly closeSessionParameters = Type.Object({
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
  });

  private readonly materializeSandbox: () => Promise<MaterializedDaytonaSandbox>;
  private materializedSandboxPromise: Promise<MaterializedDaytonaSandbox> | null = null;
  private readonly trackedSessionIds = new Set<string>();

  constructor(materializeSandbox: () => Promise<MaterializedDaytonaSandbox>) {
    super();
    this.materializeSandbox = materializeSandbox;
  }

  listTools(): ToolDefinition[] {
    return [
      this.getListPtySessionsTool(),
      this.getExecuteCommandTool(),
      this.getSendPtyInputTool(),
      this.getReadPtyOutputTool(),
      this.getResizePtyTool(),
      this.getKillSessionTool(),
      this.getCloseSessionTool(),
    ];
  }

  async dispose(): Promise<void> {
    const materializedSandbox = this.materializedSandboxPromise
      ? await this.materializedSandboxPromise
      : null;
    const trackedSessionIds = [...this.trackedSessionIds];
    this.trackedSessionIds.clear();
    if (materializedSandbox) {
      await Promise.allSettled(trackedSessionIds.map(async (sessionId) => {
        await this.killTmuxSession(sessionId).catch(() => undefined);
      }));
      await materializedSandbox.release().catch(() => undefined);
    }
  }

  private getListPtySessionsTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.listPtySessionsParameters> {
    return {
      description: "List the tmux-backed sandbox sessions currently tracked by this agent runtime.",
      execute: async () => {
        const sessions = await this.listTrackedTmuxSessions();
        return {
          content: [{
            type: "text",
            text: this.formatListPtySessionsResult(sessions),
          }],
        };
      },
      label: "list_pty_sessions",
      name: "list_pty_sessions",
      parameters: AgentComputeDaytonaSandbox.listPtySessionsParameters,
      promptGuidelines: [
        "Use list_pty_sessions when you need to review the tmux sessions created or reused by this prompt run.",
      ],
      promptSnippet: "List sandbox tmux sessions",
    };
  }

  private getExecuteCommandTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.executeCommandParameters> {
    return {
      description: "Execute a shell command inside a sandbox tmux session and return captured pane output.",
      execute: async (_toolCallId, params) => {
        const result = await this.executeCommand(params);
        return {
          content: [{
            type: "text",
            text: this.formatExecuteCommandResult(result),
          }],
        };
      },
      label: "execute_command",
      name: "execute_command",
      parameters: AgentComputeDaytonaSandbox.executeCommandParameters,
      promptGuidelines: [
        "Use execute_command to create or continue work in a sandbox tmux session.",
        "Reuse the returned sessionId when you want later tool calls to target the same tmux shell.",
      ],
      promptSnippet: "Execute commands in the sandbox",
    };
  }

  private getSendPtyInputTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.sendPtyInputParameters> {
    return {
      description: "Send additional terminal input to an existing sandbox tmux session and return new pane output.",
      execute: async (_toolCallId, params) => {
        const result = await this.sendPtyInput(
          params.sessionId,
          params.input,
          params.yield_time_ms,
        );
        return {
          content: [{
            type: "text",
            text: this.formatExecuteCommandResult(result),
          }],
        };
      },
      label: "send_pty_input",
      name: "send_pty_input",
      parameters: AgentComputeDaytonaSandbox.sendPtyInputParameters,
      promptGuidelines: [
        "Use send_pty_input to continue interacting with an existing tmux shell after execute_command returns.",
      ],
      promptSnippet: "Send input to a sandbox terminal session",
    };
  }

  private getReadPtyOutputTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.readPtyOutputParameters> {
    return {
      description: "Read pane output directly from an existing sandbox tmux session.",
      execute: async (_toolCallId, params) => {
        const outputPage = await this.readPtyOutput(
          params.sessionId,
          params.afterOffset ?? null,
          params.limit ?? AgentComputeDaytonaSandbox.DEFAULT_READ_OUTPUT_LIMIT,
        );
        return {
          content: [{
            type: "text",
            text: this.formatReadPtyOutputResult(params.sessionId, outputPage),
          }],
        };
      },
      label: "read_pty_output",
      name: "read_pty_output",
      parameters: AgentComputeDaytonaSandbox.readPtyOutputParameters,
      promptGuidelines: [
        "Use read_pty_output to fetch more output from a tmux session after a prior execute or input call.",
      ],
      promptSnippet: "Read sandbox terminal output",
    };
  }

  private getResizePtyTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.resizePtyParameters> {
    return {
      description: "Resize the tmux window backing an existing sandbox session.",
      execute: async (_toolCallId, params) => {
        await this.resizePty(params.sessionId, params.columns, params.rows);
        return {
          content: [{
            type: "text",
            text: `Resized session ${params.sessionId} to ${params.columns} columns by ${params.rows} rows.`,
          }],
        };
      },
      label: "resize_pty",
      name: "resize_pty",
      parameters: AgentComputeDaytonaSandbox.resizePtyParameters,
      promptGuidelines: [
        "Resize the session when terminal applications depend on viewport dimensions.",
      ],
      promptSnippet: "Resize a sandbox terminal session",
    };
  }

  private getKillSessionTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.killSessionParameters> {
    return {
      description: "Kill a sandbox tmux session immediately.",
      execute: async (_toolCallId, params) => {
        await this.killSession(params.sessionId);
        return {
          content: [{
            type: "text",
            text: `Killed session ${params.sessionId}.`,
          }],
        };
      },
      label: "kill_session",
      name: "kill_session",
      parameters: AgentComputeDaytonaSandbox.killSessionParameters,
      promptGuidelines: [
        "Use kill_session when a sandbox tmux shell is hung or must be terminated immediately.",
      ],
      promptSnippet: "Kill a sandbox terminal session",
    };
  }

  private getCloseSessionTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.closeSessionParameters> {
    return {
      description: "Close a sandbox tmux session by killing it and releasing its shell state.",
      execute: async (_toolCallId, params) => {
        await this.closeSession(params.sessionId);
        return {
          content: [{
            type: "text",
            text: `Closed session ${params.sessionId}.`,
          }],
        };
      },
      label: "close_session",
      name: "close_session",
      parameters: AgentComputeDaytonaSandbox.closeSessionParameters,
      promptGuidelines: [
        "Use close_session when you are done with a tmux session and no longer need its shell state.",
      ],
      promptSnippet: "Close a sandbox terminal session",
    };
  }

  private async executeCommand(input: AgentComputeCommandInput): Promise<AgentComputeCommandResult> {
    if (input.command.trim().length === 0) {
      throw new Error("command is required.");
    }

    const sessionId = input.sessionId?.trim() || `pty-${randomUUID().replaceAll("-", "")}`;
    await this.ensureTmuxSession(sessionId, input);
    const startOffset = await this.captureTmuxOutputLength(sessionId);
    const commandRun = await this.startTmuxCommand(sessionId, input);
    const waitResult = await this.waitForTmuxCommand(commandRun.rcFile, this.resolveYieldTimeMilliseconds(input));
    const output = await this.captureTmuxOutputSince(sessionId, startOffset);
    if (waitResult.completed) {
      await this.deleteRemoteFile(commandRun.rcFile);
    }

    return {
      completed: waitResult.completed,
      exitCode: waitResult.exitCode,
      output,
      sessionId,
    };
  }

  private async sendPtyInput(
    sessionId: string,
    input: string,
    yieldTimeMilliseconds?: number,
  ): Promise<AgentComputeCommandResult> {
    await this.ensureExistingTmuxSession(sessionId);
    const startOffset = await this.captureTmuxOutputLength(sessionId);
    await this.sendInputToTmuxSession(sessionId, input);
    const waitResult = await this.waitForSessionExit(
      sessionId,
      this.resolveYieldTimeMilliseconds({
        command: input,
        yield_time_ms: yieldTimeMilliseconds,
      }),
    );
    const output = waitResult.completed
      ? ""
      : await this.captureTmuxOutputSince(sessionId, startOffset);

    return {
      completed: waitResult.completed,
      exitCode: waitResult.exitCode,
      output,
      sessionId,
    };
  }

  private async readPtyOutput(
    sessionId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentComputePtyOutputPage> {
    await this.ensureExistingTmuxSession(sessionId);
    const fullOutput = await this.captureTmuxOutput(sessionId);
    const cursor = Math.max(0, afterOffset ?? 0);
    const nextOffset = Math.min(fullOutput.length, cursor + Math.max(1, limit));
    const text = fullOutput.slice(cursor, nextOffset);

    return {
      chunks: text.length > 0
        ? [{
          createdAt: new Date().toISOString(),
          offset: cursor,
          stream: "terminal",
          text,
        }]
        : [],
      nextOffset,
    };
  }

  private async resizePty(sessionId: string, columns: number, rows: number): Promise<void> {
    await this.ensureExistingTmuxSession(sessionId);
    await this.runRequiredRemoteCommand(
      `tmux resize-window -t ${AgentComputeDaytonaSandbox.shellQuote(sessionId)} -x ${columns} -y ${rows}`,
    );
  }

  private async killSession(sessionId: string): Promise<void> {
    await this.killTmuxSession(sessionId);
    this.trackedSessionIds.delete(sessionId);
  }

  private async closeSession(sessionId: string): Promise<void> {
    await this.killSession(sessionId);
  }

  private async listTmuxSessions(): Promise<TmuxSessionInfo[]> {
    const output = await this.runRemoteCommand(
      "sh -lc 'tmux list-sessions -F \"#{session_name}\t#{session_attached}\t#{session_created}\t#{window_width}\t#{window_height}\" 2>/dev/null || true'",
    );

    return output.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [id, attached, createdAt, width, height] = line.split("\t");
        return {
          attached: attached === "1",
          createdAt: createdAt ?? "",
          height: Number(height ?? "0"),
          id: id ?? "",
          width: Number(width ?? "0"),
        };
      })
      .filter((session) => session.id.length > 0);
  }

  private async listTrackedTmuxSessions(): Promise<TmuxSessionInfo[]> {
    if (this.trackedSessionIds.size === 0) {
      return [];
    }

    const trackedSessionIds = new Set(this.trackedSessionIds);
    const sessions = await this.listTmuxSessions();
    const trackedSessions = sessions.filter((session) => trackedSessionIds.has(session.id));
    this.trackedSessionIds.clear();
    for (const session of trackedSessions) {
      this.trackedSessionIds.add(session.id);
    }

    return trackedSessions;
  }

  private async ensureTmuxSession(
    sessionId: string,
    input: AgentComputeCommandInput,
  ): Promise<void> {
    if (await this.hasTmuxSession(sessionId)) {
      this.trackedSessionIds.add(sessionId);
      return;
    }

    const creationCommand = [
      `mkdir -p ${AgentComputeDaytonaSandbox.shellQuote(AgentComputeDaytonaSandbox.STATE_DIRECTORY)}`,
      "&&",
      "tmux new-session -d",
      `-s ${AgentComputeDaytonaSandbox.shellQuote(sessionId)}`,
      input.columns ? `-x ${input.columns}` : "",
      input.rows ? `-y ${input.rows}` : "",
      input.workingDirectory ? `-c ${AgentComputeDaytonaSandbox.shellQuote(input.workingDirectory)}` : "",
      AgentComputeDaytonaSandbox.shellQuote(this.buildShellBootstrapCommand(input.environment)),
    ].filter((segment) => segment.length > 0).join(" ");
    await this.runRequiredRemoteCommand(creationCommand);
    this.trackedSessionIds.add(sessionId);
  }

  private async ensureExistingTmuxSession(sessionId: string): Promise<void> {
    if (await this.hasTmuxSession(sessionId)) {
      this.trackedSessionIds.add(sessionId);
      return;
    }

    throw new Error(`Sandbox session ${sessionId} was not found.`);
  }

  private async startTmuxCommand(
    sessionId: string,
    input: AgentComputeCommandInput,
  ): Promise<TmuxCommandRun> {
    const commandRunId = randomUUID().replaceAll("-", "");
    const doneKey = `${sessionId}-${commandRunId}-done`;
    const commandFile = `${AgentComputeDaytonaSandbox.STATE_DIRECTORY}/${commandRunId}.command.sh`;
    const rcFile = `${AgentComputeDaytonaSandbox.STATE_DIRECTORY}/${commandRunId}.rc`;
    await this.writeRemoteFile(
      commandFile,
      this.buildCommandFileContents(input),
    );
    await this.deleteRemoteFile(rcFile);
    const wrapperCommand = [
      `sh ${AgentComputeDaytonaSandbox.shellQuote(commandFile)}`,
      "rc=$?",
      `rm -f ${AgentComputeDaytonaSandbox.shellQuote(commandFile)}`,
      `printf '%s' "$rc" > ${AgentComputeDaytonaSandbox.shellQuote(rcFile)}`,
      `tmux wait-for -S ${AgentComputeDaytonaSandbox.shellQuote(doneKey)}`,
    ].join("; ");
    await this.sendInputToTmuxSession(sessionId, wrapperCommand, true);

    return {
      rcFile,
    };
  }

  private async waitForTmuxCommand(
    rcFile: string,
    yieldTimeMilliseconds: number,
  ): Promise<{
    completed: boolean;
    exitCode: number | null;
  }> {
    const deadline = Date.now() + yieldTimeMilliseconds;
    while (true) {
      const exitCode = await this.readExitCodeIfPresent(rcFile);
      if (exitCode !== null) {
        return {
          completed: true,
          exitCode,
        };
      }

      const remainingMilliseconds = deadline - Date.now();
      if (remainingMilliseconds <= 0) {
        return {
          completed: false,
          exitCode: null,
        };
      }

      await AgentComputeDaytonaSandbox.delay(Math.min(
        AgentComputeDaytonaSandbox.POLL_INTERVAL_MILLISECONDS,
        remainingMilliseconds,
      ));
    }
  }

  private async waitForSessionExit(
    sessionId: string,
    yieldTimeMilliseconds: number,
  ): Promise<{
    completed: boolean;
    exitCode: number | null;
  }> {
    const deadline = Date.now() + yieldTimeMilliseconds;
    while (true) {
      if (!await this.hasTmuxSession(sessionId)) {
        return {
          completed: true,
          exitCode: null,
        };
      }

      const remainingMilliseconds = deadline - Date.now();
      if (remainingMilliseconds <= 0) {
        return {
          completed: false,
          exitCode: null,
        };
      }

      await AgentComputeDaytonaSandbox.delay(Math.min(
        AgentComputeDaytonaSandbox.POLL_INTERVAL_MILLISECONDS,
        remainingMilliseconds,
      ));
    }
  }

  private async captureTmuxOutputLength(sessionId: string): Promise<number> {
    const output = await this.captureTmuxOutput(sessionId);
    return output.length;
  }

  private async captureTmuxOutputSince(sessionId: string, offset: number): Promise<string> {
    const output = await this.captureTmuxOutput(sessionId);
    return output.slice(offset);
  }

  private async captureTmuxOutput(sessionId: string): Promise<string> {
    const output = await this.runRequiredRemoteCommand(
      `tmux capture-pane -pt ${AgentComputeDaytonaSandbox.shellQuote(sessionId)} -S -32768`,
    );
    return output;
  }

  private async sendInputToTmuxSession(
    sessionId: string,
    input: string,
    appendEnter = false,
  ): Promise<void> {
    const command = this.buildSendKeysCommand(sessionId, input, appendEnter);
    if (command.length === 0) {
      return;
    }

    await this.runRequiredRemoteCommand(command);
  }

  private buildSendKeysCommand(sessionId: string, input: string, appendEnter = false): string {
    const lines = input.split("\n");
    const commands = [] as string[];
    const shouldSendTrailingEnter = appendEnter || input.endsWith("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (line.length > 0) {
        commands.push(
          `tmux send-keys -t ${AgentComputeDaytonaSandbox.shellQuote(sessionId)} -l -- ${AgentComputeDaytonaSandbox.shellQuote(line)}`,
        );
      }

      if (index < lines.length - 1 || shouldSendTrailingEnter) {
        commands.push(
          `tmux send-keys -t ${AgentComputeDaytonaSandbox.shellQuote(sessionId)} Enter`,
        );
      }
    }

    return commands.join("\n");
  }

  private buildShellBootstrapCommand(environment?: Record<string, string>): string {
    const exports = Object.entries(environment ?? {})
      .map(([key, value]) => `${key}=${AgentComputeDaytonaSandbox.shellQuote(value)}`)
      .join(" ");
    if (exports.length === 0) {
      return "env PS1='' sh";
    }

    return `env PS1='' ${exports} sh`;
  }

  private buildCommandFileContents(input: AgentComputeCommandInput): string {
    const lines = [] as string[];
    if (input.workingDirectory) {
      lines.push(`cd ${AgentComputeDaytonaSandbox.shellQuote(input.workingDirectory)}`);
    }

    for (const [key, value] of Object.entries(input.environment ?? {})) {
      lines.push(`export ${key}=${AgentComputeDaytonaSandbox.shellQuote(value)}`);
    }

    lines.push(input.command);

    return `${lines.join("\n")}\n`;
  }

  private async writeRemoteFile(path: string, content: string): Promise<void> {
    const hereDocToken = `__COMPANYHELM_${randomUUID().replaceAll("-", "")}__`;
    await this.runRequiredRemoteCommand([
      `cat > ${AgentComputeDaytonaSandbox.shellQuote(path)} <<'${hereDocToken}'`,
      content.endsWith("\n") ? content.slice(0, -1) : content,
      hereDocToken,
    ].join("\n"));
  }

  private async deleteRemoteFile(path: string): Promise<void> {
    await this.runRemoteCommand(`rm -f ${AgentComputeDaytonaSandbox.shellQuote(path)}`);
  }

  private async readExitCodeIfPresent(path: string): Promise<number | null> {
    const output = await this.runRemoteCommand(
      `sh -lc 'if [ -f ${AgentComputeDaytonaSandbox.shellQuote(path)} ]; then cat ${AgentComputeDaytonaSandbox.shellQuote(path)}; fi'`,
    );
    const trimmedOutput = output.stdout.trim();
    if (trimmedOutput.length === 0) {
      return null;
    }

    const exitCode = Number(trimmedOutput);
    if (!Number.isInteger(exitCode)) {
      throw new Error(`Invalid exit code returned for tmux command: ${trimmedOutput}`);
    }

    return exitCode;
  }

  private async hasTmuxSession(sessionId: string): Promise<boolean> {
    const commandResult = await this.runRemoteCommand(
      `tmux has-session -t ${AgentComputeDaytonaSandbox.shellQuote(sessionId)} 2>/dev/null`,
    );

    return commandResult.exitCode === 0;
  }

  private async killTmuxSession(sessionId: string): Promise<void> {
    await this.runRemoteCommand(
      `tmux kill-session -t ${AgentComputeDaytonaSandbox.shellQuote(sessionId)} 2>/dev/null || true`,
    );
  }

  private resolveMaterializedSandbox(): Promise<MaterializedDaytonaSandbox> {
    if (!this.materializedSandboxPromise) {
      this.materializedSandboxPromise = this.materializeSandbox();
    }

    return this.materializedSandboxPromise;
  }

  private async runRequiredRemoteCommand(
    command: string,
    timeoutSeconds = AgentComputeDaytonaSandbox.REMOTE_COMMAND_TIMEOUT_SECONDS,
  ): Promise<string> {
    const commandResult = await this.runRemoteCommand(command, timeoutSeconds);
    if (commandResult.exitCode !== 0) {
      throw new Error(`Sandbox command failed (${commandResult.exitCode}): ${commandResult.stdout || command}`);
    }

    return commandResult.stdout;
  }

  private async runRemoteCommand(
    command: string,
    timeoutSeconds = AgentComputeDaytonaSandbox.REMOTE_COMMAND_TIMEOUT_SECONDS,
  ): Promise<{
    exitCode: number;
    stdout: string;
  }> {
    const materializedSandbox = await this.resolveMaterializedSandbox();
    const result = await materializedSandbox.remoteSandbox.process.executeCommand(
      command,
      undefined,
      undefined,
      timeoutSeconds,
    );

    return {
      exitCode: result.exitCode,
      stdout: result.artifacts?.stdout ?? result.result,
    };
  }

  private resolveYieldTimeMilliseconds(input: AgentComputeCommandInput): number {
    const configuredYieldTime = input.yield_time_ms;
    if (!Number.isFinite(configuredYieldTime)) {
      return AgentComputeDaytonaSandbox.DEFAULT_EXECUTE_COMMAND_YIELD_MS;
    }

    return Math.max(0, Number(configuredYieldTime));
  }

  private formatExecuteCommandResult(result: AgentComputeCommandResult): string {
    const output = result.output.length > 0 ? result.output : "(no output)";
    return [
      `sessionId: ${result.sessionId}`,
      `completed: ${result.completed}`,
      `exitCode: ${result.exitCode === null ? "null" : result.exitCode}`,
      "output:",
      output,
    ].join("\n");
  }

  private formatReadPtyOutputResult(sessionId: string, outputPage: AgentComputePtyOutputPage): string {
    const combinedOutput = outputPage.chunks.map((chunk) => chunk.text).join("");
    return [
      `sessionId: ${sessionId}`,
      `nextOffset: ${outputPage.nextOffset === null ? "null" : outputPage.nextOffset}`,
      "output:",
      combinedOutput.length > 0 ? combinedOutput : "(no output)",
    ].join("\n");
  }

  private formatListPtySessionsResult(sessions: TmuxSessionInfo[]): string {
    if (sessions.length === 0) {
      return "No tracked PTY sessions found.";
    }

    return sessions.map((session) => {
      return [
        `sessionId: ${session.id}`,
        `attached: ${session.attached}`,
        `createdAt: ${session.createdAt}`,
        `size: ${session.width}x${session.height}`,
      ].join("\n");
    }).join("\n\n");
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }

  private static async delay(milliseconds: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
