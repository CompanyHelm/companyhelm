import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { TransactionProviderInterface } from "../../../../../db/transaction_provider_interface.ts";

/**
 * Defines the PI Mono write tool override for one CompanyHelm agent session. Its current scope is
 * preserving the built-in write tool interface while returning deterministic stub data so the
 * agent can discover the tool before file creation and overwrite behavior exists.
 */
export class PiMonoWriteTool {
  private static readonly parameters = Type.Object({
    path: Type.String({
      description: "Path to the file to write.",
    }),
    content: Type.String({
      description: "The full file contents to write.",
    }),
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

  getDefinition(): ToolDefinition<typeof PiMonoWriteTool.parameters> {
    return {
      name: "write",
      label: "write",
      description: "Create or overwrite a file with new content.",
      promptSnippet: "Create or overwrite files",
      promptGuidelines: ["Use write when creating a file or replacing its full contents."],
      parameters: PiMonoWriteTool.parameters,
      execute: async (_toolCallId, params) => {
        return {
          content: [{
            type: "text",
            text: `Stub write result for "${params.path}" in session ${this.sessionId} on agent ${this.agentId}.`,
          }],
          details: {
            agentId: this.agentId,
            contentLength: params.content.length,
            path: params.path,
            sessionId: this.sessionId,
            transactionProviderAvailable: typeof this.transactionProvider.transaction === "function",
          },
        };
      },
    };
  }
}
