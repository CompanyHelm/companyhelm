import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentSecretResultFormatter } from "./result_formatter.ts";
import { AgentSecretToolService } from "./service.ts";

/**
 * Reads the plaintext value of one secret already attached to the current chat session. This is a
 * last-resort escape hatch for tools that cannot consume environment variables directly.
 */
export class AgentReadSecretTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    envVarName: Type.String({
      description: "Environment variable name of an already attached session secret, for example GITHUB_TOKEN.",
    }),
  });

  private readonly secretToolService: AgentSecretToolService;

  constructor(secretToolService: AgentSecretToolService) {
    this.secretToolService = secretToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentReadSecretTool.parameters> {
    return {
      description:
        "Read the plaintext value of one secret attached to this chat session by environment variable name. Prefer using attached secrets through environment variables in pty_exec, bash_exec, gh_exec, or other exec-style tools instead of calling this tool.",
      execute: async (_toolCallId, input) => {
        const secret = await this.secretToolService.readAssignedSecret(input.envVarName);
        return {
          content: [{
            text: AgentSecretResultFormatter.formatReadSecret(secret),
            type: "text",
          }],
          details: {
            envVarName: secret.envVarName,
            name: secret.name,
            type: "secret",
            value: secret.value,
          },
        };
      },
      label: "read_secret",
      name: "read_secret",
      parameters: AgentReadSecretTool.parameters,
      promptGuidelines: [
        "Use list_assigned_secrets first when you only need to confirm what is available in the current session.",
        "Prefer referencing the secret through its environment variable in pty_exec, bash_exec, gh_exec, or similar tools instead of reading plaintext directly.",
        "Only use read_secret when a downstream tool genuinely needs the raw secret value outside an exec-style environment.",
      ],
      promptSnippet: "Read one attached session secret",
    };
  }
}
