import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { SystemCommandService } from "../../../../../system_command_service.ts";
import { AgentSessionBootstrapContext } from "../../bootstrap_context.ts";
import { AgentToolParameterSchema } from "../parameter_schema.ts";

/**
 * Exposes a tiny generic command bridge for activated system skills. Command-specific schemas are
 * revealed by the skill activation response, keeping the startup tool catalog small.
 */
export class AgentSystemCommandTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    id: Type.String({
      description: "The system command ID revealed by an active system skill.",
    }),
    input: Type.Any({
      description: "Command-specific JSON input revealed by the active system skill.",
    }),
  });

  private readonly bootstrapContext: AgentSessionBootstrapContext;
  private readonly systemCommandService: SystemCommandService;

  constructor(
    bootstrapContext: AgentSessionBootstrapContext,
    systemCommandService: SystemCommandService,
  ) {
    this.bootstrapContext = bootstrapContext;
    this.systemCommandService = systemCommandService;
  }

  createDefinition(): ToolDefinition<typeof AgentSystemCommandTool.parameters> {
    return {
      description: "Run a system command exposed by an active system skill. Requires a command id and generic JSON input.",
      execute: async (_toolCallId, params) => {
        const result = await this.systemCommandService.executeCommand(params.id, params.input, {
          agentId: this.bootstrapContext.agentId,
          companyId: this.bootstrapContext.companyId,
          sessionId: this.bootstrapContext.sessionId,
          transactionProvider: this.bootstrapContext.transactionProvider,
        });

        return {
          content: [{
            text: JSON.stringify(result, null, 2),
            type: "text",
          }],
          details: {
            id: params.id,
            output: result,
            type: "system_command",
          },
        };
      },
      label: "system_command",
      name: "system_command",
      parameters: AgentSystemCommandTool.parameters,
      promptGuidelines: [
        "Use system_command only with command IDs revealed by an active system skill.",
        "Activate the relevant skill first; the command will be rejected if its owning system skill is not active.",
      ],
      promptSnippet: "Run an activated system command",
    };
  }
}
