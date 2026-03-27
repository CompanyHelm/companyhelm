import type {
  AgentComputePtyOutputChunk,
  AgentComputePtyOutputPage,
} from "../sandbox_interface.ts";

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

/**
 * Tracks one Daytona PTY session and buffers its terminal output for paginated reads. The class is
 * internal to the Daytona adapter and translates the streaming websocket API into the generic
 * sandbox tool contract.
 */
export class AgentComputeDaytonaPty {
  private readonly id: string;
  private readonly outputChunks: AgentComputePtyOutputChunk[] = [];
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

  async executeCommand(command: string): Promise<void> {
    await this.sendInput(AgentComputeDaytonaPty.normalizeCommand(command));
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
    return this.outputChunks
      .filter((chunk) => afterOffset == null || chunk.offset > afterOffset)
      .map((chunk) => chunk.text)
      .join("");
  }

  async resize(columns: number, rows: number): Promise<void> {
    await this.handle.resize(columns, rows);
  }

  async waitForYieldOrExit(yieldTimeMs: number): Promise<{
    completed: boolean;
    exitCode?: number;
  }> {
    if (yieldTimeMs === 0) {
      return {
        completed: false,
      };
    }

    const timeoutResult = await Promise.race([
      this.waitPromise.then((result) => ({
        completed: true,
        exitCode: result.exitCode,
      })),
      new Promise<{
        completed: boolean;
        exitCode?: number;
      }>((resolve) => {
        setTimeout(() => {
          resolve({
            completed: false,
          });
        }, yieldTimeMs);
      }),
    ]);

    return timeoutResult;
  }

  async close(): Promise<void> {
    await this.handle.disconnect();
  }

  private appendOutput(data: Uint8Array): void {
    const text = this.textDecoder.decode(data);
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

  private static normalizeCommand(command: string): string {
    return command.endsWith("\n") ? command : `${command}\n`;
  }
}
