import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { TransactionProviderInterface } from "../../../../../db/transaction_provider_interface.ts";

/**
 * Defines the PI Mono read-file tool bound to a specific CompanyHelm agent session. Its current
 * scope is exposing the tool contract the SDK expects while keeping execution stubbed so the
 * surrounding session wiring can land before real filesystem access rules are implemented.
 */
export class PiMonoReadFileTool {
  private static readonly parameters = Type.Object({
    path: Type.String({
      description: "Path to the file to read.",
    }),
    offset: Type.Optional(Type.Number({
      description: "Line number to start reading from (1-indexed).",
    })),
    limit: Type.Optional(Type.Number({
      description: "Maximum number of lines to read.",
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

  getDefinition(): ToolDefinition<typeof PiMonoReadFileTool.parameters> {
    return {
      name: "read",
      label: "read",
      description: "Reads a file from the current workspace.",
      promptSnippet: "Read file contents",
      promptGuidelines: ["Use read to examine files instead of cat or sed."],
      parameters: PiMonoReadFileTool.parameters,
      execute: async (_toolCallId, params) => {
        return {
          content: [{
            type: "text",
            text: `Stub read result for "${params.path}" in session ${this.sessionId} on agent ${this.agentId}.`,
          }],
          details: {
            agentId: this.agentId,
            limit: params.limit,
            offset: params.offset,
            path: params.path,
            sessionId: this.sessionId,
            transactionProviderAvailable: typeof this.transactionProvider.transaction === "function",
          },
        };
      },
    };
  }
}
