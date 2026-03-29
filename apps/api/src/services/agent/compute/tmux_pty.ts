import { randomUUID } from "node:crypto";
import type {
  AgentEnvironmentCommandInput,
  AgentEnvironmentCommandResult,
  AgentEnvironmentTerminalOutputPage,
  AgentEnvironmentTerminalSession,
} from "./environment_interface.ts";
import { AgentEnvironmentPtyInterface } from "./pty_interface.ts";
import { AgentEnvironmentShellInterface } from "./shell_interface.ts";

type TmuxCommandRun = {
  rcFile: string;
  outputEndMarker: string;
  outputStartMarker: string;
};

/**
 * Implements tmux-backed PTY management on top of the generic environment shell contract. This
 * keeps tmux session orchestration reusable across providers that can execute normal shell
 * commands, while provider adapters stay focused on reaching the remote environment itself.
 */
export class AgentEnvironmentTmuxPty extends AgentEnvironmentPtyInterface {
  private static readonly DEFAULT_EXECUTE_COMMAND_YIELD_MS = 1_000;
  private static readonly DEFAULT_READ_OUTPUT_LIMIT = 4_000;
  private static readonly POLL_INTERVAL_MILLISECONDS = 100;
  private static readonly REMOTE_COMMAND_TIMEOUT_SECONDS = 30;
  private static readonly STATE_DIRECTORY = "/tmp/companyhelm";
  private readonly environmentShell: AgentEnvironmentShellInterface;
  private tmuxPrepared = false;

  constructor(environmentShell: AgentEnvironmentShellInterface) {
    super();
    this.environmentShell = environmentShell;
  }

  async executeCommand(input: AgentEnvironmentCommandInput): Promise<AgentEnvironmentCommandResult> {
    await this.ensureTmuxPrepared();
    if (input.command.trim().length === 0) {
      throw new Error("command is required.");
    }

    const sessionId = AgentComputeDaytonaEnvironment.resolveSessionId(input.sessionId);
    await this.ensureTmuxSession(sessionId, input);
    const startOffset = await this.captureTmuxOutputLength(sessionId);
    const commandRun = await this.startTmuxCommand(sessionId, input);
    const waitResult = await this.waitForTmuxCommand(commandRun.rcFile, this.resolveYieldTimeMilliseconds(input));
    const output = this.sanitizeCommandOutput(
      await this.captureTmuxOutputSince(sessionId, startOffset),
      commandRun.outputStartMarker,
      commandRun.outputEndMarker,
    );
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
    await this.ensureTmuxPrepared();
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
    await this.ensureTmuxPrepared();
    await this.ensureExistingTmuxSession(sessionId);
    const fullOutput = await this.captureTmuxOutput(sessionId);
    const cursor = Math.max(0, afterOffset ?? 0);
    const nextOffset = Math.min(
      fullOutput.length,
      cursor + Math.max(1, limit || AgentEnvironmentTmuxPty.DEFAULT_READ_OUTPUT_LIMIT),
    );
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
    await this.ensureTmuxPrepared();
    const output = await this.runRequiredRemoteCommand(
      "sh -lc 'tmux list-sessions -F \"#{session_name}\t#{session_attached}\t#{session_created}\t#{window_width}\t#{window_height}\" 2>/dev/null || true'",
    );

    return output
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
    await this.ensureTmuxPrepared();
    await this.ensureExistingTmuxSession(sessionId);
    await this.runRequiredRemoteCommand(
      `tmux resize-window -t ${AgentEnvironmentTmuxPty.shellQuote(sessionId)} -x ${columns} -y ${rows}`,
    );
  }

  async killSession(sessionId: string): Promise<void> {
    await this.ensureTmuxPrepared();
    await this.runRemoteCommand(
      `tmux kill-session -t ${AgentEnvironmentTmuxPty.shellQuote(sessionId)} 2>/dev/null || true`,
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
      `mkdir -p ${AgentEnvironmentTmuxPty.shellQuote(AgentEnvironmentTmuxPty.STATE_DIRECTORY)}`,
      "&&",
      "tmux new-session -d",
      `-s ${AgentEnvironmentTmuxPty.shellQuote(sessionId)}`,
      input.columns ? `-x ${input.columns}` : "",
      input.rows ? `-y ${input.rows}` : "",
      input.workingDirectory ? `-c ${AgentEnvironmentTmuxPty.shellQuote(input.workingDirectory)}` : "",
      AgentEnvironmentTmuxPty.shellQuote(this.buildShellBootstrapCommand(input.environment)),
    ].filter((segment) => segment.length > 0).join(" ");
    await this.runRequiredRemoteCommand(creationCommand);
  }

  private async ensureExistingTmuxSession(sessionId: string): Promise<void> {
    if (await this.hasTmuxSession(sessionId)) {
      return;
    }

    throw new Error(`Sandbox session ${sessionId} was not found.`);
  }

  private async ensureTmuxPrepared(): Promise<void> {
    if (this.tmuxPrepared) {
      return;
    }

    const result = await this.environmentShell.executeCommand(
      "sh -lc 'command -v tmux >/dev/null 2>&1 || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y tmux)'",
      undefined,
      undefined,
      300,
    );
    if (result.exitCode !== 0) {
      throw new Error(`Failed to prepare tmux in environment: ${result.stdout}`);
    }

    this.tmuxPrepared = true;
  }

  private async startTmuxCommand(
    sessionId: string,
    input: AgentEnvironmentCommandInput,
  ): Promise<TmuxCommandRun> {
    const commandRunId = randomUUID().replaceAll("-", "");
    const commandFile = `${AgentEnvironmentTmuxPty.STATE_DIRECTORY}/${commandRunId}.command.sh`;
    const rcFile = `${AgentEnvironmentTmuxPty.STATE_DIRECTORY}/${commandRunId}.rc`;
    const outputStartMarker = `__COMPANYHELM_OUTPUT_START_${commandRunId}__`;
    const outputEndMarker = `__COMPANYHELM_OUTPUT_END_${commandRunId}__`;
    await this.writeRemoteFile(commandFile, this.buildCommandFileContents(input, outputStartMarker, outputEndMarker));
    await this.deleteRemoteFile(rcFile);
    const wrapperCommand = [
      `sh ${AgentEnvironmentTmuxPty.shellQuote(commandFile)}`,
      "rc=$?",
      `rm -f ${AgentEnvironmentTmuxPty.shellQuote(commandFile)}`,
      `printf '%s' "$rc" > ${AgentEnvironmentTmuxPty.shellQuote(rcFile)}`,
    ].join("; ");
    await this.sendInputToTmuxSession(sessionId, wrapperCommand, true);

    return {
      rcFile,
      outputEndMarker,
      outputStartMarker,
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

      await AgentEnvironmentTmuxPty.delay(Math.min(
        AgentEnvironmentTmuxPty.POLL_INTERVAL_MILLISECONDS,
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

      await AgentEnvironmentTmuxPty.delay(Math.min(
        AgentEnvironmentTmuxPty.POLL_INTERVAL_MILLISECONDS,
        remainingMilliseconds,
      ));
    }
  }

  private async captureTmuxOutput(sessionId: string): Promise<string> {
    return this.runRequiredRemoteCommand(
      `tmux capture-pane -pt ${AgentEnvironmentTmuxPty.shellQuote(sessionId)} -S -32768`,
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

  private buildCommandFileContents(
    input: AgentEnvironmentCommandInput,
    outputStartMarker: string,
    outputEndMarker: string,
  ): string {
    const lines = [] as string[];
    lines.push(`printf '%s\\n' ${AgentEnvironmentTmuxPty.shellQuote(outputStartMarker)}`);
    if (input.workingDirectory) {
      lines.push(`cd ${AgentEnvironmentTmuxPty.shellQuote(input.workingDirectory)}`);
    }

    for (const [key, value] of Object.entries(input.environment ?? {})) {
      lines.push(`export ${key}=${AgentEnvironmentTmuxPty.shellQuote(value)}`);
    }

    lines.push(input.command);
    lines.push(`printf '\\n%s\\n' ${AgentEnvironmentTmuxPty.shellQuote(outputEndMarker)}`);

    return `${lines.join("\n")}\n`;
  }

  private sanitizeCommandOutput(output: string, outputStartMarker: string, outputEndMarker: string): string {
    const startIndex = output.indexOf(outputStartMarker);
    const slicedOutput = startIndex >= 0
      ? output.slice(startIndex + outputStartMarker.length).replace(/^\r?\n/, "")
      : output;
    const endIndex = slicedOutput.indexOf(outputEndMarker);
    const visibleOutput = endIndex >= 0 ? slicedOutput.slice(0, endIndex) : slicedOutput;

    return visibleOutput.replace(/(?:\r?\n[ \t]*)+$/u, "");
  }

  private buildSendKeysCommand(sessionId: string, input: string, appendEnter = false): string {
    const lines = input.split("\n");
    const commands = [] as string[];
    const shouldSendTrailingEnter = appendEnter || input.endsWith("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (line.length > 0) {
        commands.push(
          `tmux send-keys -t ${AgentEnvironmentTmuxPty.shellQuote(sessionId)} -l -- ${AgentEnvironmentTmuxPty.shellQuote(line)}`,
        );
      }

      if (index < lines.length - 1 || shouldSendTrailingEnter) {
        commands.push(
          `tmux send-keys -t ${AgentEnvironmentTmuxPty.shellQuote(sessionId)} Enter`,
        );
      }
    }

    return commands.join("\n");
  }

  private buildShellBootstrapCommand(environment?: Record<string, string>): string {
    const exports = Object.entries(environment ?? {})
      .map(([key, value]) => `${key}=${AgentEnvironmentTmuxPty.shellQuote(value)}`)
      .join(" ");
    if (exports.length === 0) {
      return "env PS1='' sh";
    }

    return `env PS1='' ${exports} sh`;
  }

  private async deleteRemoteFile(path: string): Promise<void> {
    await this.runRemoteCommand(`rm -f ${AgentEnvironmentTmuxPty.shellQuote(path)}`);
  }

  private async hasTmuxSession(sessionId: string): Promise<boolean> {
    const commandResult = await this.runRemoteCommand(
      `tmux has-session -t ${AgentEnvironmentTmuxPty.shellQuote(sessionId)} 2>/dev/null`,
    );

    return commandResult.exitCode === 0;
  }

  private async readExitCodeIfPresent(path: string): Promise<number | null> {
    const output = await this.runRemoteCommand(
      `sh -lc 'if [ -f ${AgentEnvironmentTmuxPty.shellQuote(path)} ]; then cat ${AgentEnvironmentTmuxPty.shellQuote(path)}; fi'`,
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
      return AgentEnvironmentTmuxPty.DEFAULT_EXECUTE_COMMAND_YIELD_MS;
    }

    return Math.max(0, Number(configuredYieldTime));
  }

  private async runRequiredRemoteCommand(
    command: string,
    timeoutSeconds = AgentEnvironmentTmuxPty.REMOTE_COMMAND_TIMEOUT_SECONDS,
  ): Promise<string> {
    const commandResult = await this.runRemoteCommand(command, timeoutSeconds);
    if (commandResult.exitCode !== 0) {
      throw new Error(`Sandbox command failed (${commandResult.exitCode}): ${commandResult.stdout || command}`);
    }

    return commandResult.stdout;
  }

  private runRemoteCommand(
    command: string,
    timeoutSeconds = AgentEnvironmentTmuxPty.REMOTE_COMMAND_TIMEOUT_SECONDS,
  ): Promise<{
    exitCode: number;
    stdout: string;
  }> {
    return this.environmentShell.executeCommand(command, undefined, undefined, timeoutSeconds);
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
      `cat > ${AgentEnvironmentTmuxPty.shellQuote(path)} <<'${hereDocToken}'`,
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
