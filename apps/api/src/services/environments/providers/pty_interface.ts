import type {
  AgentEnvironmentCommandInput,
  AgentEnvironmentCommandResult,
  AgentEnvironmentPty,
  AgentEnvironmentTerminalOutputPage,
} from "./environment_interface.ts";

/**
 * Defines the reusable PTY operations that agent tools expect once an environment has been
 * leased. Concrete implementations can be backed by tmux, Windows terminals, or other provider-
 * specific PTY mechanisms without changing the tool layer.
 */
export abstract class AgentEnvironmentPtyInterface {
  /**
   * Executes a shell command inside the leased environment. When ptyId is provided, the command
   * runs in a durable named PTY that is created automatically if missing. Otherwise the older
   * session-oriented tmux behavior remains available for internal tools.
   */
  abstract executeCommand(input: AgentEnvironmentCommandInput): Promise<AgentEnvironmentCommandResult>;

  /**
   * Writes additional terminal input into an existing PTY.
   */
  abstract sendInput(ptyId: string, input: string, yieldTimeMilliseconds?: number): Promise<AgentEnvironmentCommandResult>;

  /**
   * Reads output from an existing PTY.
   */
  abstract readOutput(
    ptyId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentEnvironmentTerminalOutputPage>;

  /**
   * Lists PTYs that currently exist inside the environment.
   */
  abstract listPtys(): Promise<AgentEnvironmentPty[]>;

  /**
   * Resizes an existing PTY.
   */
  abstract resizePty(ptyId: string, columns: number, rows: number): Promise<void>;

  /**
   * Terminates an existing PTY immediately.
   */
  abstract killPty(ptyId: string): Promise<void>;

  /**
   * Releases any PTY-local resources held by the implementation itself.
   */
  abstract dispose(): Promise<void>;
}
