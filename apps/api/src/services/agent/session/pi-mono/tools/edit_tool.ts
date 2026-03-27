import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { TransactionProviderInterface } from "../../../../../db/transaction_provider_interface.ts";

/**
 * Defines the PI Mono edit tool override for one CompanyHelm agent session. Its current scope is
 * mirroring the built-in edit tool interface while returning stubbed edit metadata so the runtime
 * can expose the tool safely before file mutation is implemented.
 */
export class PiMonoEditTool {
  private static readonly parameters = Type.Object({
    path: Type.String({
      description: "Path to the file to edit.",
    }),
    oldText: Type.String({
      description: "The exact text to replace.",
    }),
    newText: Type.String({
      description: "The replacement text.",
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

  getDefinition(): ToolDefinition<typeof PiMonoEditTool.parameters> {
    return {
      name: "edit",
      label: "edit",
      description: "Edit a file in place using an exact text replacement.",
      promptSnippet: "Edit existing files in place",
      promptGuidelines: ["Use edit for precise replacements inside an existing file."],
      parameters: PiMonoEditTool.parameters,
      execute: async (_toolCallId, params) => {
        return {
          content: [{
            type: "text",
            text: `Stub edit result for "${params.path}" in session ${this.sessionId} on agent ${this.agentId}.`,
          }],
          details: {
            agentId: this.agentId,
            newTextLength: params.newText.length,
            oldTextLength: params.oldText.length,
            path: params.path,
            sessionId: this.sessionId,
            transactionProviderAvailable: typeof this.transactionProvider.transaction === "function",
          },
        };
      },
    };
  }
}
