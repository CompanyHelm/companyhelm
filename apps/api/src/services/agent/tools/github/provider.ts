import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentEnvironmentPromptScope } from "../../environment/prompt_scope.ts";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentGithubExecTool } from "./exec.ts";
import { AgentGithubInstallationService } from "./installation_service.ts";
import { AgentListGithubInstallationsTool } from "./list_installations.ts";

/**
 * Groups GitHub-specific tools behind one provider so the shared tool catalog can add installation
 * inspection and `gh` execution without hardcoding those individual tools in the session manager.
 */
export class AgentGithubToolProvider extends AgentToolProviderInterface {
  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly installationService: AgentGithubInstallationService;

  constructor(
    promptScope: AgentEnvironmentPromptScope,
    installationService: AgentGithubInstallationService,
  ) {
    super();
    this.promptScope = promptScope;
    this.installationService = installationService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentListGithubInstallationsTool(this.installationService).createDefinition(),
      new AgentGithubExecTool(this.promptScope, this.installationService).createDefinition(),
    ];
  }
}
