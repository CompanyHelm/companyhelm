import type {
  AgentEnvironmentCommandInput,
  AgentEnvironmentCommandResult,
  AgentEnvironmentTerminalOutputPage,
  AgentEnvironmentTerminalSession,
} from "./environment_interface.ts";

/**
 * Defines the reusable PTY/session operations that agent tools expect once an environment has been
 * leased. Concrete implementations can be backed by tmux, Windows terminals, or other provider-
 * specific PTY mechanisms without changing the tool layer.
 */
export abstract class AgentEnvironmentPtyInterface {
  /**
   * Executes a shell command inside the leased environment.
   */
  abstract executeCommand(input: AgentEnvironmentCommandInput): Promise<AgentEnvironmentCommandResult>;

  /**
   * Writes additional terminal input into an existing session.
   */
  abstract sendInput(sessionId: string, input: string, yieldTimeMilliseconds?: number): Promise<AgentEnvironmentCommandResult>;

  /**
   * Reads output from an existing terminal session.
   */
  abstract readOutput(
    sessionId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentEnvironmentTerminalOutputPage>;

  /**
   * Lists terminal sessions that currently exist inside the environment.
   */
  abstract listSessions(): Promise<AgentEnvironmentTerminalSession[]>;

  /**
   * Resizes an existing terminal session.
   */
  abstract resizeSession(sessionId: string, columns: number, rows: number): Promise<void>;

  /**
   * Terminates an existing terminal session immediately.
   */
  abstract killSession(sessionId: string): Promise<void>;

  /**
   * Releases any PTY-local resources held by the implementation itself.
   */
  abstract dispose(): Promise<void>;
}
