import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

export type AgentComputeCommandInput = {
  columns?: number;
  command: string;
  environment?: Record<string, string>;
  sessionId?: string | null;
  rows?: number;
  workingDirectory?: string;
  yield_time_ms?: number;
};

export type AgentComputeCommandResult = {
  completed: boolean;
  exitCode: number | null;
  output: string;
  sessionId: string;
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
 * Describes the provider-agnostic compute environment surface exposed to PI Mono. Implementations
 * keep their runtime-specific lifecycle and PTY coordination private and only publish PI Mono
 * tool definitions that agents can invoke.
 */
export abstract class AgentEnvironmentInterface {
  /**
   * Lists the PI Mono tool definitions exposed by this runtime handle. The returned tools should
   * be self-contained and should hide provider-specific session management behind their execute
   * callbacks.
   */
  abstract listTools(): ToolDefinition[];

  /**
   * Releases any runtime-local resources held by the environment handle after the PI Mono session
   * finishes. Implementations should use this hook to detach shells, release leases, and clean up
   * any provider objects that are scoped to a single prompt run.
   */
  abstract dispose(): Promise<void>;
}
