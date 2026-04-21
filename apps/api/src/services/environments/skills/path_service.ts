import type { SkillRecord } from "../../skills/service.ts";
import { SkillGithubRepositoryReference } from "../../skills/github/repository_reference.ts";
import { injectable } from "inversify";

export type FileBackedSkillRecord = {
  githubRepositoryInstallationId: number | null;
  remoteUrl: string;
  trackedCommitSha: string;
  repository: string;
  skillDirectory: string;
  sourceType: "public_git" | "github_installation";
};

/**
 * Centralizes the cache and materialization paths for file-backed skills so shell-oriented sync
 * services can reason about one consistent directory layout instead of rebuilding path math ad hoc.
 */
@injectable()
export class AgentEnvironmentSkillPathService {
  private static readonly homeDirectory = "/home/user";
  private static readonly skillCacheRootDirectory = `${AgentEnvironmentSkillPathService.homeDirectory}/.companyhelm/skill-cache`;
  private static readonly skillRootDirectory = `${AgentEnvironmentSkillPathService.homeDirectory}/skills`;

  getSkillCacheRootDirectory(): string {
    return AgentEnvironmentSkillPathService.skillCacheRootDirectory;
  }

  getSkillRootDirectory(): string {
    return AgentEnvironmentSkillPathService.skillRootDirectory;
  }

  getSkillCacheDirectory(skill: FileBackedSkillRecord): string {
    const repositoryReference = SkillGithubRepositoryReference.parse(skill.repository);
    return [
      this.getSkillCacheRootDirectory(),
      skill.sourceType,
      repositoryReference.owner,
      repositoryReference.repository,
      skill.trackedCommitSha,
    ].join("/");
  }

  getSkillCheckoutDirectory(skill: FileBackedSkillRecord): string {
    return `${this.getSkillCacheDirectory(skill)}/checkout`;
  }

  getSkillMaterializationDirectory(skillName: string): string {
    if (skillName.length === 0) {
      throw new Error("Skill name is required.");
    }
    if (skillName === "." || skillName === "..") {
      throw new Error(`Skill name ${skillName} cannot be materialized as a directory.`);
    }
    if (skillName.includes("/") || skillName.includes("\\")) {
      throw new Error(`Skill name ${skillName} cannot contain path separators.`);
    }

    return `${this.getSkillRootDirectory()}/${skillName}`;
  }

  getSkillDocumentRepositoryPath(skill: FileBackedSkillRecord): string {
    return skill.skillDirectory === "."
      ? "SKILL.md"
      : `${skill.skillDirectory}/SKILL.md`;
  }

  getSkillDocumentCheckoutPath(skill: FileBackedSkillRecord): string {
    return `${this.getSkillCheckoutDirectory(skill)}/${this.getSkillDocumentRepositoryPath(skill)}`;
  }

  getSkillFileCheckoutPath(skill: FileBackedSkillRecord, repositoryPath: string): string {
    return `${this.getSkillCheckoutDirectory(skill)}/${repositoryPath}`;
  }

  toSkillRelativePath(skill: FileBackedSkillRecord, repositoryPath: string): string {
    const normalizedRepositoryPath = String(repositoryPath || "").trim().replace(/^\/+/, "");
    if (normalizedRepositoryPath.length === 0) {
      throw new Error("Skill repository path is required.");
    }
    if (skill.skillDirectory === ".") {
      return normalizedRepositoryPath;
    }
    if (!normalizedRepositoryPath.startsWith(`${skill.skillDirectory}/`)) {
      throw new Error(`Skill file ${normalizedRepositoryPath} is outside ${skill.skillDirectory}.`);
    }

    return normalizedRepositoryPath.slice(skill.skillDirectory.length + 1);
  }

  resolveFileBackedSkill(skill: SkillRecord): FileBackedSkillRecord | null {
    if (skill.fileList.length === 0) {
      return null;
    }

    const repository = String(skill.repository || "").trim();
    const skillDirectory = String(skill.skillDirectory || "").trim().replace(/^\/+|\/+$/g, "");
    const trackedCommitSha = String(skill.trackedCommitSha || "").trim();
    const sourceType = skill.sourceType === "github_installation" ? "github_installation" : "public_git";
    const githubRepositoryInstallationId = skill.githubRepositoryInstallationId ?? null;
    if (!repository || !skillDirectory || !trackedCommitSha) {
      throw new Error(
        `Skill ${skill.name} is file-backed but is missing repository, skillDirectory, or trackedCommitSha.`,
      );
    }
    if (sourceType === "github_installation" && !githubRepositoryInstallationId) {
      throw new Error(`Skill ${skill.name} is backed by a GitHub installation but is missing installation metadata.`);
    }

    const repositoryReference = SkillGithubRepositoryReference.parse(repository);

    return {
      githubRepositoryInstallationId,
      remoteUrl: repositoryReference.remoteUrl,
      trackedCommitSha,
      repository: repositoryReference.getFullName(),
      skillDirectory,
      sourceType,
    };
  }
}
