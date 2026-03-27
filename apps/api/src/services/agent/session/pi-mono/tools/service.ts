import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { TransactionProviderInterface } from "../../../../../db/transaction_provider_interface.ts";
import type { AgentComputeSandboxInterface } from "../../../compute/sandbox_interface.ts";
import { PiMonoBashTool } from "./bash_tool.ts";
import { PiMonoEditTool } from "./edit_tool.ts";
import { PiMonoReadFileTool } from "./read_file_tool.ts";
import { PiMonoWriteTool } from "./write_tool.ts";

/**
 * Owns the CompanyHelm-specific tool list exposed to one PI Mono session. Its scope is binding
 * tool definitions to the current agent and session identity, then merging the generic compute
 * tools for that session so PI Mono receives one coherent tool catalog.
 */
export class PiMonoToolsService {
  private readonly agentId: string;
  private readonly computeSandbox: AgentComputeSandboxInterface;
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

  getTools(): ToolDefinition[] {
    return [
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
  }
}
