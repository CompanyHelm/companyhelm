export type AgentComputeCommandInput = {
  columns?: number;
  command: string;
  environment?: Record<string, string>;
  ptyId?: string | null;
  rows?: number;
  workingDirectory?: string;
  yieldTimeMs?: number;
  yield_time_ms?: number;
};

export type AgentComputeCommandResult = {
  completed: boolean;
  exitCode: number | null;
  output: string;
  ptyId: string;
};

export type AgentComputePtyOutputChunk = {
  createdAt: string;
  offset: number;
  stream: "stderr" | "stdout" | "terminal";
  text: string;
};

export type AgentComputePtyOutputPage = {
  chunks: AgentComputePtyOutputChunk[];
  nextOffset: number | null;
};

/**
 * Describes the sandbox tools available to an agent in a provider-agnostic way. The abstraction
 * exposes PTY-oriented operations rather than provider objects so callers can work with compute
 * without depending on Daytona-specific runtime types.
 */
export abstract class AgentComputeSandboxInterface {
  /**
   * Lists the sandbox tools exposed by this runtime handle so callers can discover which PTY
   * operations are supported before invoking them.
   */
  abstract listTools(): string[];

  /**
   * Executes one command in a PTY and yields back after the requested wait budget. The PTY may
   * continue running after the method returns; the caller can continue interacting with it by id.
   */
  abstract executeCommand(input: AgentComputeCommandInput): Promise<AgentComputeCommandResult>;

  /**
   * Sends additional raw terminal input into an existing PTY session.
   */
  abstract sendPtyInput(ptyId: string, input: string): Promise<void>;

  /**
   * Reads paginated PTY output chunks after the provided offset. Implementations may surface
   * merged terminal output when the provider does not expose separate stdout and stderr streams.
   */
  abstract readPtyOutput(
    ptyId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentComputePtyOutputPage>;

  /**
   * Resizes an existing PTY terminal to match the caller's viewport.
   */
  abstract resizePty(ptyId: string, columns: number, rows: number): Promise<void>;

  /**
   * Closes an existing PTY session and releases any transport resources associated with it.
   */
  abstract closePty(ptyId: string): Promise<void>;
}
