import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { AgentComputeSandboxInterface } from "./compute/sandbox_interface.ts";
import { PiMonoBashTool } from "./session/pi-mono/tools/bash_tool.ts";
import { PiMonoEditTool } from "./session/pi-mono/tools/edit_tool.ts";
import { PiMonoReadFileTool } from "./session/pi-mono/tools/read_file_tool.ts";
import { PiMonoWriteTool } from "./session/pi-mono/tools/write_tool.ts";

/**
 * Owns the full tool lifecycle for one agent runtime. It initializes the PI Mono tool definitions
 * before the session is created, keeps the compute sandbox bound to that runtime, and performs
 * cleanup when the runtime is disposed so provider-backed resources such as PTY sessions are
 * disconnected at the end of the turn.
 */
export class AgentToolsService {
  private readonly agentId: string;
  private readonly computeSandbox: AgentComputeSandboxInterface;
  private initializedTools: ToolDefinition[] | null = null;
  private readonly sessionId: string;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    agentId: string,
    computeSandbox: AgentComputeSandboxInterface,
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
  ) {
    this.agentId = agentId;
    this.computeSandbox = computeSandbox;
    this.transactionProvider = transactionProvider;
    this.sessionId = sessionId;
  }

  initializeTools(): ToolDefinition[] {
    if (this.initializedTools) {
      return this.initializedTools;
    }

    this.initializedTools = [
      new PiMonoBashTool(
        this.agentId,
        this.transactionProvider,
        this.sessionId,
      ).getDefinition(),
      new PiMonoEditTool(
        this.agentId,
        this.transactionProvider,
        this.sessionId,
      ).getDefinition(),
      new PiMonoReadFileTool(
        this.agentId,
        this.transactionProvider,
        this.sessionId,
      ).getDefinition(),
      new PiMonoWriteTool(
        this.agentId,
        this.transactionProvider,
        this.sessionId,
      ).getDefinition(),
      ...this.computeSandbox.listTools(),
    ];

    return this.initializedTools;
  }

  async cleanupTools(): Promise<void> {
    const disposableSandbox = this.computeSandbox as {
      dispose?: () => Promise<void> | void;
    };
    if (typeof disposableSandbox.dispose === "function") {
      await disposableSandbox.dispose();
    }

    this.initializedTools = null;
  }
}
