import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { TransactionProviderInterface } from "../../../../../db/transaction_provider_interface.ts";
import { PiMonoBashTool } from "./bash_tool.ts";
import { PiMonoEditTool } from "./edit_tool.ts";
import { PiMonoReadFileTool } from "./read_file_tool.ts";
import { PiMonoWriteTool } from "./write_tool.ts";

/**
 * Owns the CompanyHelm-specific tool list exposed to one PI Mono session. Its scope is binding
 * tool definitions to the current agent and session identity so later implementations can add real
 * authorization and storage behavior without rebuilding that context at each call site.
 */
export class PiMonoToolsService {
  private readonly agentId: string;
  private readonly sessionId: string;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    agentId: string,
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
  ) {
    this.agentId = agentId;
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
    ];
  }
}
