import { inject, injectable } from "inversify";
import { AgentEnvironmentShellInterface } from "../providers/shell_interface.ts";
import { AgentEnvironmentSkillPathService, type FileBackedSkillRecord } from "./path_service.ts";
import type { SkillRecord } from "../../skills/service.ts";
import { GithubClient } from "../../../github/client.ts";
import type { Config } from "../../../config/schema.ts";

/**
 * Manages the shared repository-plus-commit cache used by file-backed skills. It fetches only the
 * tracked commit and checks out only the requested skill files into the cache worktree so later
 * materialization does not pull unrelated repository content into the runtime.
 */
@injectable()
export class AgentEnvironmentSkillCheckoutCacheService {
  private readonly githubClient: GithubClient;
  private readonly pathService: AgentEnvironmentSkillPathService;

  constructor(
    @inject(AgentEnvironmentSkillPathService)
    pathService: AgentEnvironmentSkillPathService = new AgentEnvironmentSkillPathService(),
    @inject(GithubClient)
    githubClient: GithubClient = new GithubClient({} as Config),
  ) {
    this.githubClient = githubClient;
    this.pathService = pathService;
  }

  async prepareCheckout(
    environmentShell: AgentEnvironmentShellInterface,
    skill: SkillRecord,
  ): Promise<void> {
    const fileBackedSkill = this.pathService.resolveFileBackedSkill(skill);
    if (!fileBackedSkill) {
      return;
    }

    const checkoutDirectory = this.pathService.getSkillCheckoutDirectory(fileBackedSkill);
    const repositoryUrl = fileBackedSkill.remoteUrl;
    const installationToken = fileBackedSkill.sourceType === "github_installation"
      ? await this.githubClient.getInstallationAccessToken(this.requireInstallationId(fileBackedSkill))
      : null;
    const requestedRepositoryPaths = [
      this.pathService.getSkillDocumentRepositoryPath(fileBackedSkill),
      ...skill.fileList,
    ];
    const uniqueRequestedRepositoryPaths = [...new Set(requestedRepositoryPaths)];
    const scriptLines = [
      "set -eu",
      `checkout_dir=${AgentEnvironmentSkillCheckoutCacheService.shellQuote(checkoutDirectory)}`,
      `repository_url=${AgentEnvironmentSkillCheckoutCacheService.shellQuote(repositoryUrl)}`,
      `commit_sha=${AgentEnvironmentSkillCheckoutCacheService.shellQuote(fileBackedSkill.trackedCommitSha)}`,
      "if [ ! -d \"$checkout_dir/.git\" ]; then",
      "  rm -rf \"$checkout_dir\"",
      "  mkdir -p \"$checkout_dir\"",
      "  git init \"$checkout_dir\"",
      "  git -C \"$checkout_dir\" remote add origin \"$repository_url\"",
      "  git -C \"$checkout_dir\" config remote.origin.promisor true",
      "  git -C \"$checkout_dir\" config remote.origin.partialclonefilter blob:none",
      "fi",
      ...this.buildFetchScriptLines(installationToken !== null),
      [
        "git -C \"$checkout_dir\" checkout --force \"$commit_sha\" --",
        ...uniqueRequestedRepositoryPaths.map((repositoryPath) =>
          AgentEnvironmentSkillCheckoutCacheService.shellQuote(repositoryPath)
        ),
      ].join(" "),
    ];
    const result = await environmentShell.executeCommand(
      `bash -lc ${AgentEnvironmentSkillCheckoutCacheService.shellQuote(scriptLines.join("\n"))}`,
      undefined,
      installationToken
        ? {
            GITHUB_INSTALLATION_TOKEN: installationToken,
            GIT_TERMINAL_PROMPT: "0",
          }
        : undefined,
    );
    if (result.exitCode !== 0) {
      throw new Error(`Failed to cache file-backed skill ${skill.name}: ${result.stdout}`);
    }
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }

  private requireInstallationId(skill: FileBackedSkillRecord): number {
    if (skill.githubRepositoryInstallationId === null) {
      throw new Error("GitHub installation-backed skill is missing installation metadata.");
    }

    return skill.githubRepositoryInstallationId;
  }

  private buildFetchScriptLines(usesInstallationToken: boolean): string[] {
    if (!usesInstallationToken) {
      return [
        "git -C \"$checkout_dir\" fetch --depth 1 --filter=blob:none origin \"$commit_sha\"",
      ];
    }

    return [
      "auth_header=$(printf '%s' \"x-access-token:${GITHUB_INSTALLATION_TOKEN}\" | base64 | tr -d '\\n')",
      [
        "git -C \"$checkout_dir\"",
        "-c credential.helper=",
        "-c http.https://github.com/.extraheader=\"AUTHORIZATION: basic ${auth_header}\"",
        "fetch --depth 1 --filter=blob:none origin \"$commit_sha\"",
      ].join(" "),
    ];
  }
}
