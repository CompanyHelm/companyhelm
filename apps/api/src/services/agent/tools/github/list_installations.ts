import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentGithubInstallationService } from "./installation_service.ts";
import { AgentGithubResultFormatter } from "./result_formatter.ts";

/**
 * Lists the GitHub App installations linked to the current company together with the cached
 * repositories mirrored for each installation so the agent can choose where to run `gh` commands.
 */
export class AgentListGithubInstallationsTool {
  private static readonly parameters = Type.Object({});
  private readonly installationService: AgentGithubInstallationService;

  constructor(installationService: AgentGithubInstallationService) {
    this.installationService = installationService;
  }

  createDefinition(): ToolDefinition<typeof AgentListGithubInstallationsTool.parameters> {
    return {
      description: "List the GitHub installations linked to this company together with their repositories.",
      execute: async () => {
        const installations = await this.installationService.listInstallations();
        return {
          content: [{
            text: AgentGithubResultFormatter.formatInstallationList(installations),
            type: "text",
          }],
        };
      },
      label: "list_github_installations",
      name: "list_github_installations",
      parameters: AgentListGithubInstallationsTool.parameters,
      promptGuidelines: [
        "Use list_github_installations before gh_exec when you need to know which installation id and repositories are available.",
      ],
      promptSnippet: "List linked GitHub installations and repositories",
    };
  }
}
