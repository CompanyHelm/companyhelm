/**
 * Describes one tmux-backed terminal session that is currently reachable inside a leased agent
 * environment. Tool callers use these records to decide whether to reuse an existing shell or
 * create a new one with execute_command.
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
  sessionId?: string | null;
  rows?: number;
  workingDirectory?: string;
  yield_time_ms?: number;
};

/**
 * Reports the outcome of a terminal command or input push. The output is already combined across
 * stdout and stderr because tmux exposes a single pane transcript to the agent.
 */
export type AgentEnvironmentCommandResult = {
  completed: boolean;
  exitCode: number | null;
  output: string;
  sessionId: string;
};

/**
 * Represents one contiguous slice of terminal output returned from readOutput. Offsets are
 * character based because the tmux pane transcript is read as text.
 */
export type AgentEnvironmentTerminalOutputChunk = {
  createdAt: string;
  offset: number;
  stream: "terminal";
  text: string;
};

/**
 * Pages terminal output so follow-up tool calls can continue reading from a tmux session without
 * the API process keeping any extra buffer in memory.
 */
export type AgentEnvironmentTerminalOutputPage = {
  chunks: AgentEnvironmentTerminalOutputChunk[];
  nextOffset: number | null;
};

/**
 * A leased environment handle couples provider runtime operations with lease ownership. Prompt-run
 * tools use this interface without needing to know how environments are selected, provisioned, or
 * kept sticky for later follow-up turns.
 */
export abstract class AgentEnvironmentInterface {
  /**
   * Executes a shell command inside the leased environment, optionally reusing an existing tmux
   * session when the caller provides a previous session id.
   */
  abstract executeCommand(input: AgentEnvironmentCommandInput): Promise<AgentEnvironmentCommandResult>;

  /**
   * Sends raw terminal input into an existing tmux session and waits for additional output until
   * the yield deadline elapses or the shell exits.
   */
  abstract sendInput(sessionId: string, input: string, yieldTimeMilliseconds?: number): Promise<AgentEnvironmentCommandResult>;

  /**
   * Reads terminal output directly from tmux starting at the requested offset.
   */
  abstract readOutput(
    sessionId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentEnvironmentTerminalOutputPage>;

  /**
   * Lists the tmux sessions that currently exist inside the leased environment.
   */
  abstract listSessions(): Promise<AgentEnvironmentTerminalSession[]>;

  /**
   * Resizes an existing tmux session so terminal applications can react to the new dimensions.
   */
  abstract resizeSession(sessionId: string, columns: number, rows: number): Promise<void>;

  /**
   * Kills a tmux session immediately.
   */
  abstract killSession(sessionId: string): Promise<void>;

  /**
   * Closes a tmux session when the agent no longer needs to preserve its shell state.
   */
  abstract closeSession(sessionId: string): Promise<void>;

  /**
   * Ends prompt-run ownership of the leased environment. Implementations should dispose any
   * runtime-local resources and transition the lease into its warm idle state.
   */
  abstract dispose(): Promise<void>;
}
