import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentSecretResultFormatter } from "./result_formatter.ts";
import { AgentSecretToolService } from "./service.ts";

/**
 * Lists the secret metadata already attached to the current chat session. These are the secrets
 * that exec-style command tools can inject into the environment for the active run.
 */
export class AgentListAssignedSecretsTool {
  private static readonly parameters = AgentToolParameterSchema.object({});
  private readonly secretToolService: AgentSecretToolService;

  constructor(secretToolService: AgentSecretToolService) {
    this.secretToolService = secretToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListAssignedSecretsTool.parameters> {
    return {
      description:
        "List the secrets attached to this chat session. These secrets are available as environment variables when using exec-style command tools. Returns only the name, description, and env variable name, never the secret values.",
      execute: async () => {
        const secrets = await this.secretToolService.listAssignedSecrets();
        return {
          content: [{
            text: AgentSecretResultFormatter.formatAssignedSecrets(secrets),
            type: "text",
          }],
        };
      },
      label: "list_assigned_secrets",
      name: "list_assigned_secrets",
      parameters: AgentListAssignedSecretsTool.parameters,
      promptGuidelines: [
        "Use list_assigned_secrets when you need to confirm which secrets are already available to execute_command or other exec-style tools in this session.",
      ],
      promptSnippet: "List secrets attached to this session",
    };
  }
}
