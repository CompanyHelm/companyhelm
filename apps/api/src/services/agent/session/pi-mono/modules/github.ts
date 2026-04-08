import { GithubClient } from "../../../../../github/client.ts";
import type { AgentToolProviderInterface } from "../../../tools/provider_interface.ts";
import { AgentGithubInstallationService } from "../../../tools/github/installation_service.ts";
import { AgentGithubToolProvider } from "../../../tools/github/provider.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Owns the GitHub capability slice by binding installation-token lookup and prompt-scope shell
 * access into the GitHub tool provider only when a PI Mono session is assembled.
 */
export class GithubSessionModule extends AgentSessionModuleInterface {
  private readonly githubClient: GithubClient;

  constructor(githubClient: GithubClient) {
    super();
    this.githubClient = githubClient;
  }

  getName(): string {
    return "github";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentGithubToolProvider(
        context.promptScope,
        new AgentGithubInstallationService(
          context.transactionProvider,
          context.companyId,
          this.githubClient,
        ),
      ),
    ];
  }
}
