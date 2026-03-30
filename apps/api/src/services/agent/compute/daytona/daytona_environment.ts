import { randomUUID } from "node:crypto";
import type {
  AgentEnvironmentCommandInput,
  AgentEnvironmentCommandResult,
  AgentEnvironmentTerminalOutputPage,
  AgentEnvironmentTerminalSession,
} from "../environment_interface.ts";
import { AgentEnvironmentRuntimeInterface } from "../runtime_interface.ts";

type DaytonaRemoteSandbox = {
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

type TmuxCommandRun = {
  rcFile: string;
};

/**
 * Implements tmux-backed terminal operations for one Daytona environment. It reads pane output
 * directly from tmux on demand so the API process does not need to keep any extra terminal buffer
 * in memory between tool calls.
 */
export class AgentComputeDaytonaEnvironment extends AgentEnvironmentRuntimeInterface {
  private static readonly DEFAULT_EXECUTE_COMMAND_YIELD_MS = 1_000;
  private static readonly DEFAULT_READ_OUTPUT_LIMIT = 4_000;
  private static readonly POLL_INTERVAL_MILLISECONDS = 100;
  private static readonly REMOTE_COMMAND_TIMEOUT_SECONDS = 30;
  private static readonly STATE_DIRECTORY = "/tmp/companyhelm";
  private readonly remoteSandbox: DaytonaRemoteSandbox;

  constructor(remoteSandbox: DaytonaRemoteSandbox) {
    super();
    this.remoteSandbox = remoteSandbox;
  }

  async executeCommand(input: AgentEnvironmentCommandInput): Promise<AgentEnvironmentCommandResult> {
    if (input.command.trim().length === 0) {
      throw new Error("command is required.");
    }

    const sessionId = AgentComputeDaytonaEnvironment.resolveSessionId(input.sessionId);
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

  async sendInput(
    sessionId: string,
    input: string,
    yieldTimeMilliseconds?: number,
  ): Promise<AgentEnvironmentCommandResult> {
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

  async readOutput(
    sessionId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentEnvironmentTerminalOutputPage> {
    await this.ensureExistingTmuxSession(sessionId);
    const fullOutput = await this.captureTmuxOutput(sessionId);
    const cursor = Math.max(0, afterOffset ?? 0);
    const nextOffset = Math.min(fullOutput.length, cursor + Math.max(1, limit || AgentComputeDaytonaEnvironment.DEFAULT_READ_OUTPUT_LIMIT));
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

  async listSessions(): Promise<AgentEnvironmentTerminalSession[]> {
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

  async resizeSession(sessionId: string, columns: number, rows: number): Promise<void> {
    await this.ensureExistingTmuxSession(sessionId);
    await this.runRequiredRemoteCommand(
      `tmux resize-window -t ${AgentComputeDaytonaEnvironment.shellQuote(sessionId)} -x ${columns} -y ${rows}`,
    );
  }

  async killSession(sessionId: string): Promise<void> {
    await this.runRemoteCommand(
      `tmux kill-session -t ${AgentComputeDaytonaEnvironment.shellQuote(sessionId)} 2>/dev/null || true`,
    );
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.killSession(sessionId);
  }

  async dispose(): Promise<void> {
    return undefined;
  }

  private static resolveSessionId(sessionId?: string | null): string {
    const trimmedSessionId = sessionId?.trim() || "";
    return trimmedSessionId.length > 0 ? trimmedSessionId : "main";
  }

  private async ensureTmuxSession(
    sessionId: string,
    input: AgentEnvironmentCommandInput,
  ): Promise<void> {
    if (await this.hasTmuxSession(sessionId)) {
      return;
    }

    const creationCommand = [
      `mkdir -p ${AgentComputeDaytonaEnvironment.shellQuote(AgentComputeDaytonaEnvironment.STATE_DIRECTORY)}`,
      "&&",
      "tmux new-session -d",
      `-s ${AgentComputeDaytonaEnvironment.shellQuote(sessionId)}`,
      input.columns ? `-x ${input.columns}` : "",
      input.rows ? `-y ${input.rows}` : "",
      input.workingDirectory ? `-c ${AgentComputeDaytonaEnvironment.shellQuote(input.workingDirectory)}` : "",
      AgentComputeDaytonaEnvironment.shellQuote(this.buildShellBootstrapCommand(input.environment)),
    ].filter((segment) => segment.length > 0).join(" ");
    await this.runRequiredRemoteCommand(creationCommand);
  }

  private async ensureExistingTmuxSession(sessionId: string): Promise<void> {
    if (await this.hasTmuxSession(sessionId)) {
      return;
    }

    throw new Error(`Sandbox session ${sessionId} was not found.`);
  }

  private async startTmuxCommand(
    sessionId: string,
    input: AgentEnvironmentCommandInput,
  ): Promise<TmuxCommandRun> {
    const commandRunId = randomUUID().replaceAll("-", "");
    const commandFile = `${AgentComputeDaytonaEnvironment.STATE_DIRECTORY}/${commandRunId}.command.sh`;
    const rcFile = `${AgentComputeDaytonaEnvironment.STATE_DIRECTORY}/${commandRunId}.rc`;
    await this.writeRemoteFile(commandFile, this.buildCommandFileContents(input));
    await this.deleteRemoteFile(rcFile);
    const wrapperCommand = [
      `sh ${AgentComputeDaytonaEnvironment.shellQuote(commandFile)}`,
      "rc=$?",
      `rm -f ${AgentComputeDaytonaEnvironment.shellQuote(commandFile)}`,
      `printf '%s' "$rc" > ${AgentComputeDaytonaEnvironment.shellQuote(rcFile)}`,
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

      await AgentComputeDaytonaEnvironment.delay(Math.min(
        AgentComputeDaytonaEnvironment.POLL_INTERVAL_MILLISECONDS,
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

      await AgentComputeDaytonaEnvironment.delay(Math.min(
        AgentComputeDaytonaEnvironment.POLL_INTERVAL_MILLISECONDS,
        remainingMilliseconds,
      ));
    }
  }

  private async captureTmuxOutput(sessionId: string): Promise<string> {
    return this.runRequiredRemoteCommand(
      `tmux capture-pane -pt ${AgentComputeDaytonaEnvironment.shellQuote(sessionId)} -S -32768`,
    );
  }

  private async captureTmuxOutputLength(sessionId: string): Promise<number> {
    const output = await this.captureTmuxOutput(sessionId);
    return output.length;
  }

  private async captureTmuxOutputSince(sessionId: string, offset: number): Promise<string> {
    const output = await this.captureTmuxOutput(sessionId);
    return output.slice(offset);
  }

  private buildCommandFileContents(input: AgentEnvironmentCommandInput): string {
    const lines = [] as string[];
    if (input.workingDirectory) {
      lines.push(`cd ${AgentComputeDaytonaEnvironment.shellQuote(input.workingDirectory)}`);
    }

    for (const [key, value] of Object.entries(input.environment ?? {})) {
      lines.push(`export ${key}=${AgentComputeDaytonaEnvironment.shellQuote(value)}`);
    }

    lines.push(input.command);

    return `${lines.join("\n")}\n`;
  }

  private buildSendKeysCommand(sessionId: string, input: string, appendEnter = false): string {
    const lines = input.split("\n");
    const commands = [] as string[];
    const shouldSendTrailingEnter = appendEnter || input.endsWith("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (line.length > 0) {
        commands.push(
          `tmux send-keys -t ${AgentComputeDaytonaEnvironment.shellQuote(sessionId)} -l -- ${AgentComputeDaytonaEnvironment.shellQuote(line)}`,
        );
      }

      if (index < lines.length - 1 || shouldSendTrailingEnter) {
        commands.push(
          `tmux send-keys -t ${AgentComputeDaytonaEnvironment.shellQuote(sessionId)} Enter`,
        );
      }
    }

    return commands.join("\n");
  }

  private buildShellBootstrapCommand(environment?: Record<string, string>): string {
    const exports = Object.entries(environment ?? {})
      .map(([key, value]) => `${key}=${AgentComputeDaytonaEnvironment.shellQuote(value)}`)
      .join(" ");
    if (exports.length === 0) {
      return "env PS1='' sh";
    }

    return `env PS1='' ${exports} sh`;
  }

  private async deleteRemoteFile(path: string): Promise<void> {
    await this.runRemoteCommand(`rm -f ${AgentComputeDaytonaEnvironment.shellQuote(path)}`);
  }

  private async hasTmuxSession(sessionId: string): Promise<boolean> {
    const commandResult = await this.runRemoteCommand(
      `tmux has-session -t ${AgentComputeDaytonaEnvironment.shellQuote(sessionId)} 2>/dev/null`,
    );

    return commandResult.exitCode === 0;
  }

  private async readExitCodeIfPresent(path: string): Promise<number | null> {
    const output = await this.runRemoteCommand(
      `sh -lc 'if [ -f ${AgentComputeDaytonaEnvironment.shellQuote(path)} ]; then cat ${AgentComputeDaytonaEnvironment.shellQuote(path)}; fi'`,
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

  private resolveYieldTimeMilliseconds(input: AgentEnvironmentCommandInput): number {
    const configuredYieldTime = input.yield_time_ms;
    if (!Number.isFinite(configuredYieldTime)) {
      return AgentComputeDaytonaEnvironment.DEFAULT_EXECUTE_COMMAND_YIELD_MS;
    }

    return Math.max(0, Number(configuredYieldTime));
  }

  private async runRequiredRemoteCommand(
    command: string,
    timeoutSeconds = AgentComputeDaytonaEnvironment.REMOTE_COMMAND_TIMEOUT_SECONDS,
  ): Promise<string> {
    const commandResult = await this.runRemoteCommand(command, timeoutSeconds);
    if (commandResult.exitCode !== 0) {
      throw new Error(`Sandbox command failed (${commandResult.exitCode}): ${commandResult.stdout || command}`);
    }

    return commandResult.stdout;
  }

  private async runRemoteCommand(
    command: string,
    timeoutSeconds = AgentComputeDaytonaEnvironment.REMOTE_COMMAND_TIMEOUT_SECONDS,
  ): Promise<{
    exitCode: number;
    stdout: string;
  }> {
    const result = await this.remoteSandbox.process.executeCommand(
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

  private async writeRemoteFile(path: string, content: string): Promise<void> {
    const hereDocToken = `__COMPANYHELM_${randomUUID().replaceAll("-", "")}__`;
    await this.runRequiredRemoteCommand([
      `cat > ${AgentComputeDaytonaEnvironment.shellQuote(path)} <<'${hereDocToken}'`,
      content.endsWith("\n") ? content.slice(0, -1) : content,
      hereDocToken,
    ].join("\n"));
  }

  private static async delay(milliseconds: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
