import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { GithubClient } from "../../github/client.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { AgentEnvironmentShellInterface } from "../environments/providers/shell_interface.ts";
import { GithubRepositoryProvisioningPathService } from "./path_service.ts";
import {
  GithubRepositoryProvisioningService,
  type GithubRepositoryProvisioningRepositoryRecord,
} from "./provisioning_service.ts";

/**
 * Materializes pinned GitHub repositories into an environment workspace. It intentionally uses
 * transient Git extra headers for installation-token auth so cloned repositories do not persist
 * credentials in remote URLs or git config.
 */
@injectable()
export class GithubRepositoryProvisioningSyncService {
  private static readonly cloneTimeoutSeconds = 120;

  private readonly githubClient: GithubClient;
  private readonly pathService: GithubRepositoryProvisioningPathService;
  private readonly provisioningService: GithubRepositoryProvisioningService;

  constructor(
    @inject(GithubRepositoryProvisioningService)
    provisioningService: GithubRepositoryProvisioningService = new GithubRepositoryProvisioningService(),
    @inject(GithubClient) githubClient: GithubClient = new GithubClient({} as Config),
    @inject(GithubRepositoryProvisioningPathService)
    pathService: GithubRepositoryProvisioningPathService = new GithubRepositoryProvisioningPathService(),
  ) {
    this.githubClient = githubClient;
    this.pathService = pathService;
    this.provisioningService = provisioningService;
  }

  async syncProvisionedRepositories(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      environmentShell: AgentEnvironmentShellInterface;
    },
  ): Promise<void> {
    const provisionings = await this.provisioningService.listProvisionings(
      transactionProvider,
      input.companyId,
    );
    const tokenByInstallationId = new Map<number, string>();

    for (const provisioning of provisionings) {
      const repository = provisioning.githubRepository;
      const token = await this.getInstallationToken(repository.installationId, tokenByInstallationId);
      const result = await input.environmentShell.executeCommand(
        GithubRepositoryProvisioningSyncService.buildCloneCommand(
          repository,
          this.pathService,
        ),
        undefined,
        {
          GH_PROMPT_DISABLED: "1",
          GIT_TERMINAL_PROMPT: "0",
          GITHUB_INSTALLATION_TOKEN: token,
        },
        GithubRepositoryProvisioningSyncService.cloneTimeoutSeconds,
      );
      if (result.exitCode !== 0) {
        throw new Error(`Failed to provision workspace repository ${repository.fullName}: ${result.stdout}`);
      }
    }
  }

  private async getInstallationToken(
    installationId: number,
    tokenByInstallationId: Map<number, string>,
  ): Promise<string> {
    const cachedToken = tokenByInstallationId.get(installationId);
    if (cachedToken) {
      return cachedToken;
    }

    const token = await this.githubClient.getInstallationAccessToken(installationId);
    tokenByInstallationId.set(installationId, token);
    return token;
  }

  private static buildCloneCommand(
    repository: GithubRepositoryProvisioningRepositoryRecord,
    pathService: GithubRepositoryProvisioningPathService,
  ): string {
    const workspaceDirectory = pathService.getShellWorkspaceDirectory();
    const cloneUrl = `https://github.com/${repository.fullName}.git`;
    const scriptLines = [
      "set -eu",
      `workspace_dir=${workspaceDirectory}`,
      `repository_name=${GithubRepositoryProvisioningSyncService.shellQuote(repository.name)}`,
      "repository_dir=\"$workspace_dir/$repository_name\"",
      `repository_url=${GithubRepositoryProvisioningSyncService.shellQuote(cloneUrl)}`,
      "mkdir -p \"$workspace_dir\"",
      "if [ -e \"$repository_dir\" ] && [ ! -d \"$repository_dir/.git\" ]; then",
      "  echo \"Workspace repository path already exists and is not a git repository: $repository_dir\"",
      "  exit 1",
      "fi",
      "if [ ! -d \"$repository_dir/.git\" ]; then",
      "  AUTH_HEADER=$(printf '%s' \"x-access-token:${GITHUB_INSTALLATION_TOKEN}\" | base64 | tr -d '\\n')",
      "  git -c credential.helper= -c http.https://github.com/.extraheader=\"AUTHORIZATION: basic ${AUTH_HEADER}\" clone -- \"$repository_url\" \"$repository_dir\"",
      "fi",
    ];

    return `bash -lc ${GithubRepositoryProvisioningSyncService.shellQuote(scriptLines.join("\n"))}`;
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
