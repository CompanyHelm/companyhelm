import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentSecretResultFormatter } from "./result_formatter.ts";
import { AgentSecretToolService } from "./service.ts";

/**
 * Lists the reusable company secret catalog so the agent can see which secrets exist and could be
 * attached to the current chat session later without ever reading their plaintext values.
 */
export class AgentListAvailableSecretsTool {
  private static readonly parameters = Type.Object({});
  private readonly secretToolService: AgentSecretToolService;

  constructor(secretToolService: AgentSecretToolService) {
    this.secretToolService = secretToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListAvailableSecretsTool.parameters> {
    return {
      description:
        "List all reusable company secrets that can be attached to this chat session. Returns only the name, description, and env variable name, never the secret values.",
      execute: async () => {
        const secrets = await this.secretToolService.listAvailableSecrets();
        return {
          content: [{
            text: AgentSecretResultFormatter.formatAvailableSecrets(secrets),
            type: "text",
          }],
        };
      },
      label: "list_available_secrets",
      name: "list_available_secrets",
      parameters: AgentListAvailableSecretsTool.parameters,
      promptGuidelines: [
        "Use list_available_secrets when you need to inspect which reusable company secrets exist before attaching one to this session.",
      ],
      promptSnippet: "List reusable company secrets",
    };
  }
}
