import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import { GithubPullRequestService } from "../../../../../../github/pull_requests/service.ts";
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
  private readonly pullRequestContext: {
    agentId: string;
    companyId: string;
    sessionId: string;
    transactionProvider: TransactionProviderInterface;
  };
  private readonly pullRequestService: GithubPullRequestService;

  constructor(
    promptScope: AgentEnvironmentPromptScope,
    installationService: AgentGithubInstallationService,
    pullRequestService: GithubPullRequestService = new GithubPullRequestService(),
    pullRequestContext: {
      agentId: string;
      companyId: string;
      sessionId: string;
      transactionProvider: TransactionProviderInterface;
    } = {
      agentId: "",
      companyId: "",
      sessionId: "",
      transactionProvider: {
        async transaction<T>(): Promise<T> {
          throw new Error("Transaction provider is required to track GitHub pull requests.");
        },
      },
    },
  ) {
    super();
    this.promptScope = promptScope;
    this.installationService = installationService;
    this.pullRequestService = pullRequestService;
    this.pullRequestContext = pullRequestContext;
  }

  createToolDefinitions(): unknown[] {
    return [
      new AgentListGithubInstallationsTool(this.installationService).createDefinition(),
      new AgentGithubCloneRepositoryTool(this.promptScope, this.installationService).createDefinition(),
      new AgentGithubPushBranchTool(this.promptScope, this.installationService).createDefinition(),
      new AgentGithubCreatePullRequestTool(
        this.promptScope,
        this.installationService,
        this.pullRequestService,
        this.pullRequestContext,
      ).createDefinition(),
      new AgentGithubExecTool(this.promptScope, this.installationService).createDefinition(),
    ];
  }
}
