import type {
  AgentEnvironmentCommandInput,
  AgentEnvironmentCommandResult,
  AgentEnvironmentTerminalOutputPage,
  AgentEnvironmentTerminalSession,
} from "./environment_interface.ts";

/**
 * Provider runtimes implement the raw terminal mechanics for one provisioned environment. Lease
 * ownership is layered on top by the environment access service, so runtime implementations stay
 * focused on tmux/PTY operations.
 */
export abstract class AgentEnvironmentRuntimeInterface {
  /**
   * Executes a shell command inside the provider environment.
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
   * Terminates an existing terminal session.
   */
  abstract killSession(sessionId: string): Promise<void>;

  /**
   * Closes an existing terminal session when the agent is done with it.
   */
  abstract closeSession(sessionId: string): Promise<void>;

  /**
   * Releases any provider-local resources held by the runtime object itself.
   */
  abstract dispose(): Promise<void>;
}
