import { AgentEnvironmentShellInterface } from "../providers/shell_interface.ts";
import { AgentEnvironmentSkillPathService } from "./path_service.ts";
import type { SkillRecord } from "../../skills/service.ts";

/**
 * Manages the shared repository-plus-commit cache used by file-backed skills. It fetches only the
 * tracked commit and checks out only the requested skill files into the cache worktree so later
 * materialization does not pull unrelated repository content into the runtime.
 */
export class AgentEnvironmentSkillCheckoutCacheService {
  private readonly pathService: AgentEnvironmentSkillPathService;

  constructor(
    pathService: AgentEnvironmentSkillPathService = new AgentEnvironmentSkillPathService(),
  ) {
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
    const repositoryUrl = `https://github.com/${fileBackedSkill.repository}.git`;
    const requestedRepositoryPaths = [
      this.pathService.getSkillDocumentRepositoryPath(fileBackedSkill),
      ...skill.fileList,
    ];
    const uniqueRequestedRepositoryPaths = [...new Set(requestedRepositoryPaths)];
    const scriptLines = [
      "set -eu",
      `checkout_dir=${AgentEnvironmentSkillCheckoutCacheService.shellQuote(checkoutDirectory)}`,
      `repository_url=${AgentEnvironmentSkillCheckoutCacheService.shellQuote(repositoryUrl)}`,
      `commit_sha=${AgentEnvironmentSkillCheckoutCacheService.shellQuote(fileBackedSkill.githubTrackedCommitSha)}`,
      "if [ ! -d \"$checkout_dir/.git\" ]; then",
      "  rm -rf \"$checkout_dir\"",
      "  mkdir -p \"$checkout_dir\"",
      "  git init \"$checkout_dir\"",
      "  git -C \"$checkout_dir\" remote add origin \"$repository_url\"",
      "  git -C \"$checkout_dir\" config remote.origin.promisor true",
      "  git -C \"$checkout_dir\" config remote.origin.partialclonefilter blob:none",
      "fi",
      "git -C \"$checkout_dir\" fetch --depth 1 --filter=blob:none origin \"$commit_sha\"",
      [
        "git -C \"$checkout_dir\" checkout --force \"$commit_sha\" --",
        ...uniqueRequestedRepositoryPaths.map((repositoryPath) =>
          AgentEnvironmentSkillCheckoutCacheService.shellQuote(repositoryPath)
        ),
      ].join(" "),
    ];
    const result = await environmentShell.executeCommand(
      `bash -lc ${AgentEnvironmentSkillCheckoutCacheService.shellQuote(scriptLines.join("\n"))}`,
    );
    if (result.exitCode !== 0) {
      throw new Error(`Failed to cache file-backed skill ${skill.name}: ${result.stdout}`);
    }
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
