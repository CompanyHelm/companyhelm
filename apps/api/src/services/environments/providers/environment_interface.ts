import type { AgentEnvironmentRecord } from "./provider_interface.ts";

/**
 * Describes one terminal session that is currently reachable inside a leased agent environment.
 * Tool callers use these records to decide whether to reuse an existing shell or create a new one
 * with execute_command.
 */
export type AgentEnvironmentTerminalSession = {
  attached: boolean;
  createdAt: string;
  height: number;
  id: string;
  width: number;
};

/**
 * Carries the provider-agnostic terminal execution inputs used by both execute_command and
 * follow-up terminal interactions.
 */
export type AgentEnvironmentCommandInput = {
  columns?: number;
  command: string;
  environment?: Record<string, string>;
  keepSession?: boolean;
  sessionId?: string | null;
  rows?: number;
  workingDirectory?: string;
  yield_time_ms?: number;
};

/**
 * Reports the outcome of a terminal command or input push. The output is already combined across
 * stdout and stderr because the current PTY implementation exposes one unified terminal stream to
 * the agent.
 */
export type AgentEnvironmentCommandResult = {
  completed: boolean;
  exitCode: number | null;
  output: string;
  sessionId: string | null;
};

/**
 * Carries the provider-direct one-shot shell execution inputs used by tools that do not need tmux
 * session management and should instead execute through the provider shell adapter immediately.
 */
export type AgentEnvironmentDirectShellCommandInput = {
  command: string;
  environment?: Record<string, string>;
  timeoutSeconds?: number;
  workingDirectory?: string;
};

/**
 * Reports the combined textual output and exit code from a direct provider shell execution.
 */
export type AgentEnvironmentDirectShellCommandResult = {
  exitCode: number;
  output: string;
};

/**
 * Represents one contiguous slice of terminal output returned from readOutput. Offsets are
 * character based because the PTY transcript is read as text.
 */
export type AgentEnvironmentTerminalOutputChunk = {
  createdAt: string;
  offset: number;
  stream: "terminal";
  text: string;
};

/**
 * Pages terminal output so follow-up tool calls can continue reading from a terminal session
 * without the API process keeping any extra buffer in memory.
 */
export type AgentEnvironmentTerminalOutputPage = {
  chunks: AgentEnvironmentTerminalOutputChunk[];
  nextOffset: number | null;
};

/**
 * A leased environment handle couples PTY/session operations with lease ownership. Prompt-run
 * tools use this interface without needing to know how environments are selected, provisioned, or
 * kept sticky for later follow-up turns.
 */
export abstract class AgentEnvironmentInterface {
  /**
   * Returns the durable environment catalog row backing the current lease so provider-specific
   * tools can inspect metadata such as provider, template id, and provider environment id.
   */
  abstract getRecord(): AgentEnvironmentRecord;

  /**
   * Executes a shell command inside the leased environment, optionally reusing an existing session
   * when the caller provides a previous session id.
   */
  abstract executeCommand(input: AgentEnvironmentCommandInput): Promise<AgentEnvironmentCommandResult>;

  /**
   * Executes one bash command directly through the provider shell adapter without creating or
   * reusing a tmux session.
   */
  abstract executeBashCommand(
    input: AgentEnvironmentDirectShellCommandInput,
  ): Promise<AgentEnvironmentDirectShellCommandResult>;

  /**
   * Sends raw terminal input into an existing session and waits for additional output until
   * the yield deadline elapses or the shell exits.
   */
  abstract sendInput(sessionId: string, input: string, yieldTimeMilliseconds?: number): Promise<AgentEnvironmentCommandResult>;

  /**
   * Reads terminal output directly from the active PTY implementation starting at the requested offset.
   */
  abstract readOutput(
    sessionId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentEnvironmentTerminalOutputPage>;

  /**
   * Lists the terminal sessions that currently exist inside the leased environment.
   */
  abstract listSessions(): Promise<AgentEnvironmentTerminalSession[]>;

  /**
   * Resizes an existing terminal session so terminal applications can react to the new dimensions.
   */
  abstract resizeSession(sessionId: string, columns: number, rows: number): Promise<void>;

  /**
   * Kills a terminal session immediately.
   */
  abstract killSession(sessionId: string): Promise<void>;

  /**
   * Closes a terminal session when the agent no longer needs to preserve its shell state.
   */
  abstract closeSession(sessionId: string): Promise<void>;

  /**
   * Ends prompt-run ownership of the leased environment. Implementations should dispose any
   * PTY-local resources and transition the lease into its warm idle state.
   */
  abstract dispose(): Promise<void>;
}
