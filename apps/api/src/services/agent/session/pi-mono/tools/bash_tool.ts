import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { TransactionProviderInterface } from "../../../../../db/transaction_provider_interface.ts";

/**
 * Defines the PI Mono bash tool override for one CompanyHelm agent session. Its current scope is
 * preserving the built-in bash tool contract while returning deterministic stub results so the
 * session wiring can be exercised before real command execution is introduced.
 */
export class PiMonoBashTool {
  private static readonly parameters = Type.Object({
    command: Type.String({
      description: "Shell command to execute.",
    }),
    timeout: Type.Optional(Type.Number({
      description: "Optional timeout in milliseconds.",
    })),
  });

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

  getDefinition(): ToolDefinition<typeof PiMonoBashTool.parameters> {
    return {
      name: "bash",
      label: "bash",
      description: "Run a shell command in the current workspace.",
      promptSnippet: "Run shell commands",
      promptGuidelines: ["Use bash for repository-local command execution."],
      parameters: PiMonoBashTool.parameters,
      execute: async (_toolCallId, params) => {
        return {
          content: [{
            type: "text",
            text: `Stub bash result for "${params.command}" in session ${this.sessionId} on agent ${this.agentId}.`,
          }],
          details: {
            agentId: this.agentId,
            command: params.command,
            sessionId: this.sessionId,
            timeout: params.timeout,
            transactionProviderAvailable: typeof this.transactionProvider.transaction === "function",
          },
        };
      },
    };
  }
}
