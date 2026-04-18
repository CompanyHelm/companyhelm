import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentGithubCloneRepositoryTool } from "./clone_repository.ts";
import { AgentGithubCreatePullRequestTool } from "./create_pull_request.ts";
import { AgentGithubExecTool } from "./exec.ts";
import { AgentGithubInstallationService } from "./installation_service.ts";
import { AgentListGithubInstallationsTool } from "./list_installations.ts";
import { AgentGithubPushBranchTool } from "./push_branch.ts";

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
      new AgentGithubCloneRepositoryTool(this.promptScope, this.installationService).createDefinition(),
      new AgentGithubPushBranchTool(this.promptScope, this.installationService).createDefinition(),
      new AgentGithubCreatePullRequestTool(this.promptScope, this.installationService).createDefinition(),
      new AgentGithubExecTool(this.promptScope, this.installationService).createDefinition(),
    ];
  }
}
