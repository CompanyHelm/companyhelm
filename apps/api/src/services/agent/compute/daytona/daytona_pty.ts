import type {
  AgentComputePtyOutputChunk,
  AgentComputePtyOutputPage,
} from "../sandbox_interface.ts";
import { randomUUID } from "node:crypto";

type RemotePtyHandle = {
  disconnect(): Promise<void>;
  resize(cols: number, rows: number): Promise<unknown>;
  sendInput(data: string | Uint8Array): Promise<void>;
  wait(): Promise<{
    error?: string;
    exitCode?: number;
  }>;
  waitForConnection(): Promise<void>;
};

type AgentComputeDaytonaCommandExecution = {
  completionPromise: Promise<number>;
  startOffset: number | null;
};

type ActiveCommand = {
  marker: string;
  resolveExitCode: (exitCode: number) => void;
};

/**
 * Tracks one Daytona PTY session and buffers its terminal output for paginated reads. The class is
 * internal to the Daytona adapter and translates the streaming websocket API into the generic
 * sandbox tool contract.
 */
export class AgentComputeDaytonaPty {
  private static readonly MARKER_END = "\u001f";
  private static readonly MARKER_START = "\u001e";

  private activeCommand: ActiveCommand | null = null;
  private readonly id: string;
  private readonly outputChunks: AgentComputePtyOutputChunk[] = [];
  private pendingOutputText = "";
  private readonly textDecoder = new TextDecoder();
  private readonly waitPromise: Promise<{
    error?: string;
    exitCode?: number;
  }>;
  private handle: RemotePtyHandle;
  private nextOffset = 0;

  private constructor(id: string, handle: RemotePtyHandle) {
    this.id = id;
    this.handle = handle;
    this.waitPromise = this.handle.wait();
  }

  static async create(
    id: string,
    connectHandle: (
      handleOutput: (data: Uint8Array) => void | Promise<void>,
    ) => Promise<RemotePtyHandle>,
  ): Promise<AgentComputeDaytonaPty> {
    const pendingOutput = [] as Uint8Array[];
    let pty: AgentComputeDaytonaPty | null = null;
    const handle = await connectHandle(async (data) => {
      if (!pty) {
        pendingOutput.push(data);
        return;
      }

      pty.appendOutput(data);
    });
    pty = new AgentComputeDaytonaPty(id, handle);
    for (const outputChunk of pendingOutput) {
      pty.appendOutput(outputChunk);
    }
    await handle.waitForConnection();

    return pty;
  }

  getId(): string {
    return this.id;
  }

  getLatestOffset(): number | null {
    if (this.outputChunks.length === 0) {
      return null;
    }

    return this.outputChunks[this.outputChunks.length - 1]?.offset ?? null;
  }

  async executeCommand(command: string): Promise<AgentComputeDaytonaCommandExecution> {
    if (this.activeCommand) {
      throw new Error("Cannot execute a new command while another command is still running in this PTY.");
    }

    const marker = `codex_${randomUUID().replaceAll("-", "")}`;
    let resolveExitCode: ((exitCode: number) => void) | null = null;
    const completionPromise = new Promise<number>((resolve) => {
      resolveExitCode = resolve;
    });
    const execution = {
      completionPromise,
      startOffset: this.getLatestOffset(),
    };

    this.activeCommand = {
      marker,
      resolveExitCode: resolveExitCode!,
    };
    await this.sendInput(AgentComputeDaytonaPty.wrapCommand(command, marker));

    return execution;
  }

  async sendInput(input: string): Promise<void> {
    await this.handle.sendInput(input);
  }

  readOutput(afterOffset: number | null, limit: number): AgentComputePtyOutputPage {
    const normalizedLimit = Math.max(1, limit);
    const chunks = this.outputChunks
      .filter((chunk) => afterOffset == null || chunk.offset > afterOffset)
      .slice(0, normalizedLimit);

    return {
      chunks,
      nextOffset: chunks.length > 0 ? (chunks[chunks.length - 1]?.offset ?? null) : null,
    };
  }

  readCombinedOutput(afterOffset: number | null): string {
    return `${this.outputChunks
      .filter((chunk) => afterOffset == null || chunk.offset > afterOffset)
      .map((chunk) => chunk.text)
      .join("")}${this.getPendingVisibleOutput()}`;
  }

  async resize(columns: number, rows: number): Promise<void> {
    await this.handle.resize(columns, rows);
  }

  async waitForYieldOrCommandExit(
    execution: AgentComputeDaytonaCommandExecution,
    yieldTimeMs: number,
  ): Promise<{
    completed: boolean;
    exitCode?: number;
    output: string;
  }> {
    return await Promise.race([
      execution.completionPromise.then((exitCode) => ({
        completed: true,
        exitCode,
        output: this.readCombinedOutput(execution.startOffset),
      })),
      this.waitPromise.then((result) => ({
        completed: true,
        exitCode: result.exitCode,
        output: this.readCombinedOutput(execution.startOffset),
      })),
      new Promise<{
        completed: boolean;
        exitCode?: number;
        output: string;
      }>((resolve) => {
        setTimeout(() => {
          resolve({
            completed: false,
            output: this.readCombinedOutput(execution.startOffset),
          });
        }, yieldTimeMs);
      }),
    ]);
  }

  async close(): Promise<void> {
    await this.handle.disconnect();
  }

  private appendOutput(data: Uint8Array): void {
    const text = this.textDecoder.decode(data);
    if (text.length === 0) {
      return;
    }

    this.pendingOutputText += text;
    this.drainPendingOutput();
  }

  private appendVisibleOutput(text: string): void {
    if (text.length === 0) {
      return;
    }

    this.outputChunks.push({
      createdAt: new Date().toISOString(),
      offset: this.nextOffset,
      stream: "terminal",
      text,
    });
    this.nextOffset += 1;
  }

  private drainPendingOutput(): void {
    if (!this.activeCommand) {
      const visibleOutput = this.pendingOutputText;
      this.pendingOutputText = "";
      this.appendVisibleOutput(visibleOutput);
      return;
    }

    const completedOutput = this.readCompletedCommandOutput(this.pendingOutputText, this.activeCommand.marker);
    if (completedOutput) {
      this.appendVisibleOutput(completedOutput.output);
      this.pendingOutputText = completedOutput.remainingOutput;
      this.activeCommand.resolveExitCode(completedOutput.exitCode);
      this.activeCommand = null;
      this.drainPendingOutput();
      return;
    }

    const markerPrefix = `${AgentComputeDaytonaPty.MARKER_START}${this.activeCommand.marker}:`;
    const heldTailLength = AgentComputeDaytonaPty.resolveMarkerPrefixSuffixLength(
      this.pendingOutputText,
      markerPrefix,
    );
    if (this.pendingOutputText.length <= heldTailLength) {
      return;
    }

    const visiblePrefix = heldTailLength === 0
      ? this.pendingOutputText
      : this.pendingOutputText.slice(0, -heldTailLength);
    this.pendingOutputText = heldTailLength === 0
      ? ""
      : this.pendingOutputText.slice(-heldTailLength);
    this.appendVisibleOutput(visiblePrefix);
  }

  private getPendingVisibleOutput(): string {
    if (!this.activeCommand) {
      return this.pendingOutputText;
    }

    const markerStart = `${AgentComputeDaytonaPty.MARKER_START}${this.activeCommand.marker}:`;
    const markerStartIndex = this.pendingOutputText.indexOf(markerStart);
    if (markerStartIndex === -1) {
      return this.pendingOutputText;
    }

    return this.pendingOutputText.slice(0, markerStartIndex);
  }

  private readCompletedCommandOutput(text: string, marker: string): {
    exitCode: number;
    output: string;
    remainingOutput: string;
  } | null {
    const markerMatch = new RegExp(
      `${AgentComputeDaytonaPty.escapeRegExp(AgentComputeDaytonaPty.MARKER_START)}${AgentComputeDaytonaPty.escapeRegExp(marker)}:(-?\\d+)${AgentComputeDaytonaPty.escapeRegExp(AgentComputeDaytonaPty.MARKER_END)}`,
    ).exec(text);
    if (!markerMatch || markerMatch.index == null) {
      return null;
    }

    return {
      exitCode: Number(markerMatch[1]),
      output: text.slice(0, markerMatch.index),
      remainingOutput: text.slice(markerMatch.index + markerMatch[0].length),
    };
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private static resolveMarkerPrefixSuffixLength(text: string, markerPrefix: string): number {
    const maxCandidateLength = Math.min(text.length, markerPrefix.length - 1);
    for (let candidateLength = maxCandidateLength; candidateLength > 0; candidateLength -= 1) {
      if (text.endsWith(markerPrefix.slice(0, candidateLength))) {
        return candidateLength;
      }
    }

    return 0;
  }

  private static wrapCommand(command: string, marker: string): string {
    const normalizedCommand = command.endsWith("\n") ? command : `${command}\n`;
    return `${normalizedCommand}printf '\\036${marker}:%s\\037' "$?"\n`;
  }
}
