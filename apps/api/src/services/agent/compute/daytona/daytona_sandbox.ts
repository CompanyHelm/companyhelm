import { randomUUID } from "node:crypto";
import type {
  AgentComputeCommandInput,
  AgentComputeCommandResult,
  AgentComputePtyOutputPage,
} from "../sandbox_interface.ts";
import { AgentComputeSandboxInterface } from "../sandbox_interface.ts";
import { AgentComputeDaytonaPty } from "./daytona_pty.ts";

type MaterializedDaytonaSandbox = {
  remoteSandbox: {
    process: {
      connectPty(
        sessionId: string,
        options: {
          onData: (data: Uint8Array) => void | Promise<void>;
        },
      ): Promise<{
        disconnect(): Promise<void>;
        resize(cols: number, rows: number): Promise<unknown>;
        sendInput(data: string | Uint8Array): Promise<void>;
        wait(): Promise<{
          error?: string;
          exitCode?: number;
        }>;
        waitForConnection(): Promise<void>;
      }>;
      createPty(options: {
        cols?: number;
        cwd?: string;
        envs?: Record<string, string>;
        id: string;
        onData: (data: Uint8Array) => void | Promise<void>;
        rows?: number;
      }): Promise<{
        disconnect(): Promise<void>;
        resize(cols: number, rows: number): Promise<unknown>;
        sendInput(data: string | Uint8Array): Promise<void>;
        wait(): Promise<{
          error?: string;
          exitCode?: number;
        }>;
        waitForConnection(): Promise<void>;
      }>;
    };
  };
  sandboxRecord: {
    id: string;
    status: string;
  };
};

/**
 * Adapts Daytona sandboxes onto the generic sandbox tool contract. The backing Daytona sandbox is
 * resolved lazily on first use so sessions that never invoke compute do not lease or create one.
 */
export class AgentComputeDaytonaSandbox extends AgentComputeSandboxInterface {
  private static readonly DEFAULT_EXECUTE_COMMAND_YIELD_MS = 1_000;
  private static readonly SUPPORTED_TOOLS = [
    "execute_command",
    "send_pty_input",
    "read_pty_output",
    "resize_pty",
    "close_pty",
  ];

  private readonly materializeSandbox: () => Promise<MaterializedDaytonaSandbox>;
  private readonly ptys = new Map<string, AgentComputeDaytonaPty>();
  private materializedSandboxPromise: Promise<MaterializedDaytonaSandbox> | null = null;

  constructor(materializeSandbox: () => Promise<MaterializedDaytonaSandbox>) {
    super();
    this.materializeSandbox = materializeSandbox;
  }

  listTools(): string[] {
    return [...AgentComputeDaytonaSandbox.SUPPORTED_TOOLS];
  }

  async executeCommand(input: AgentComputeCommandInput): Promise<AgentComputeCommandResult> {
    if (input.command.trim().length === 0) {
      throw new Error("command is required.");
    }

    const pty = input.ptyId
      ? await this.getOrConnectPty(input.ptyId)
      : await this.createPtyInternal({
        columns: input.columns,
        environment: input.environment,
        rows: input.rows,
        workingDirectory: input.workingDirectory,
      });
    const initialOffset = pty.getLatestOffset();
    await pty.executeCommand(input.command);
    const shouldWaitForMilliseconds = this.resolveYieldTimeMilliseconds(input);
    const waitResult = await pty.waitForYieldOrExit(shouldWaitForMilliseconds);
    const output = pty.readCombinedOutput(initialOffset);

    return {
      completed: waitResult.completed,
      exitCode: waitResult.exitCode ?? null,
      output,
      ptyId: pty.getId(),
    };
  }

  async sendPtyInput(ptyId: string, input: string): Promise<void> {
    const pty = await this.getOrConnectPty(ptyId);
    await pty.sendInput(input);
  }

  async readPtyOutput(
    ptyId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentComputePtyOutputPage> {
    const pty = await this.getOrConnectPty(ptyId);
    return pty.readOutput(afterOffset, limit);
  }

  async resizePty(ptyId: string, columns: number, rows: number): Promise<void> {
    const pty = await this.getOrConnectPty(ptyId);
    await pty.resize(columns, rows);
  }

  async closePty(ptyId: string): Promise<void> {
    const pty = await this.getOrConnectPty(ptyId);
    await pty.close();
    this.ptys.delete(ptyId);
  }

  private async createPtyInternal(options: {
    columns?: number;
    environment?: Record<string, string>;
    rows?: number;
    workingDirectory?: string;
  }): Promise<AgentComputeDaytonaPty> {
    const materializedSandbox = await this.resolveMaterializedSandbox();
    const ptyId = randomUUID();
    const pty = await AgentComputeDaytonaPty.create(ptyId, (handleOutput) => materializedSandbox.remoteSandbox.process.createPty({
      cols: options.columns,
      cwd: options.workingDirectory,
      envs: options.environment,
      id: ptyId,
      onData: handleOutput,
      rows: options.rows,
    }));
    this.ptys.set(ptyId, pty);
    return pty;
  }

  private async getOrConnectPty(ptyId: string): Promise<AgentComputeDaytonaPty> {
    const existingPty = this.ptys.get(ptyId);
    if (existingPty) {
      return existingPty;
    }

    const materializedSandbox = await this.resolveMaterializedSandbox();
    const connectedPty = await AgentComputeDaytonaPty.create(ptyId, (handleOutput) => materializedSandbox.remoteSandbox.process.connectPty(
      ptyId,
      {
        onData: handleOutput,
      },
    ));
    this.ptys.set(ptyId, connectedPty);

    return connectedPty;
  }

  private resolveMaterializedSandbox(): Promise<MaterializedDaytonaSandbox> {
    if (!this.materializedSandboxPromise) {
      this.materializedSandboxPromise = this.materializeSandbox();
    }

    return this.materializedSandboxPromise;
  }

  private resolveYieldTimeMilliseconds(input: AgentComputeCommandInput): number {
    const configuredYieldTime = input.yield_time_ms ?? input.yieldTimeMs;
    if (!Number.isFinite(configuredYieldTime)) {
      return AgentComputeDaytonaSandbox.DEFAULT_EXECUTE_COMMAND_YIELD_MS;
    }

    return Math.max(0, Number(configuredYieldTime));
  }
}
