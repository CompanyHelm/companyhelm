import type { SkillGroupRecord, SkillRecord } from "../services/skills/service.ts";
import { SkillGithubRepositoryReference } from "../services/skills/github/repository_reference.ts";
import type { SystemCommandDefinition } from "../services/skills/system_command_catalog.ts";

export type GraphqlSkillFileInventoryEntry = {
  path: string;
  url: string | null;
};

export type GraphqlSkillRecord = {
  companyId: string;
  description: string;
  fileInventory: GraphqlSkillFileInventoryEntry[];
  fileList: string[];
  githubBranchName: string | null;
  githubBranchSkillFileUrl: string | null;
  githubTrackedCommitSkillFileUrl: string | null;
  githubTrackedCommitSha: string | null;
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  repositoryUrl: string | null;
  skillDirectory: string | null;
  skillDirectoryUrl: string | null;
  skillGroupId: string | null;
  skillType: string;
  systemCommands: SystemCommandDefinition[];
  systemKey: string | null;
};

export type GraphqlSkillGroupRecord = {
  companyId: string;
  id: string;
  name: string;
};

/**
 * Keeps skill GraphQL payloads consistent across list, detail, and mutation responses.
 */
export class GraphqlSkillPresenter {
  static presentSkill(record: SkillRecord): GraphqlSkillRecord {
    const githubSource = GraphqlSkillPresenter.resolveGithubSource(record);

    return {
      companyId: record.companyId,
      description: record.description,
      fileInventory: record.fileList.map((filePath) => ({
        path: filePath,
        url: githubSource && record.githubTrackedCommitSha
          ? GraphqlSkillPresenter.buildGithubSourceUrl(
            githubSource.repositoryUrl,
            "blob",
            record.githubTrackedCommitSha,
            filePath,
          )
          : null,
      })),
      fileList: [...record.fileList],
      githubBranchName: record.githubBranchName,
      githubBranchSkillFileUrl: githubSource && record.githubBranchName && record.skillDirectory
        ? GraphqlSkillPresenter.buildGithubSourceUrl(
          githubSource.repositoryUrl,
          "blob",
          record.githubBranchName,
          GraphqlSkillPresenter.joinRepositoryPath(record.skillDirectory, "SKILL.md"),
        )
        : null,
      githubTrackedCommitSkillFileUrl: githubSource && record.githubTrackedCommitSha && record.skillDirectory
        ? GraphqlSkillPresenter.buildGithubSourceUrl(
          githubSource.repositoryUrl,
          "blob",
          record.githubTrackedCommitSha,
          GraphqlSkillPresenter.joinRepositoryPath(record.skillDirectory, "SKILL.md"),
        )
        : null,
      githubTrackedCommitSha: record.githubTrackedCommitSha,
      id: record.id,
      instructions: record.instructions,
      name: record.name,
      repository: record.repository,
      repositoryUrl: githubSource?.repositoryUrl ?? null,
      skillDirectory: record.skillDirectory,
      skillDirectoryUrl: githubSource && record.githubTrackedCommitSha && record.skillDirectory
        ? GraphqlSkillPresenter.buildGithubSourceUrl(
          githubSource.repositoryUrl,
          "tree",
          record.githubTrackedCommitSha,
          record.skillDirectory,
        )
        : null,
      skillGroupId: record.skillGroupId,
      skillType: record.skillType ?? "custom",
      systemCommands: record.systemCommands ?? [],
      systemKey: record.systemKey ?? null,
    };
  }

  static presentSkillGroup(record: SkillGroupRecord): GraphqlSkillGroupRecord {
    return {
      companyId: record.companyId,
      id: record.id,
      name: record.name,
    };
  }

  private static resolveGithubSource(record: SkillRecord): { repositoryUrl: string } | null {
    if (!record.repository) {
      return null;
    }

    try {
      const repositoryReference = SkillGithubRepositoryReference.parse(record.repository);
      const remoteUrl = new URL(repositoryReference.remoteUrl);
      if (
        remoteUrl.hostname !== "github.com"
        && remoteUrl.hostname !== "www.github.com"
      ) {
        return null;
      }

      if (!repositoryReference.owner || !repositoryReference.repository) {
        return null;
      }

      return {
        repositoryUrl: [
          "https://github.com",
          GraphqlSkillPresenter.encodePathSegment(repositoryReference.owner),
          GraphqlSkillPresenter.encodePathSegment(repositoryReference.repository),
        ].join("/"),
      };
    } catch {
      return null;
    }
  }

  private static buildGithubSourceUrl(
    repositoryUrl: string,
    view: "blob" | "tree",
    refName: string,
    repositoryPath: string,
  ): string {
    return [
      repositoryUrl,
      view,
      GraphqlSkillPresenter.encodeRepositoryPath(refName),
      GraphqlSkillPresenter.encodeRepositoryPath(repositoryPath),
    ].join("/");
  }

  private static joinRepositoryPath(...parts: string[]): string {
    return parts
      .flatMap((part) => part.split("/"))
      .filter((part) => part.length > 0)
      .join("/");
  }

  private static encodeRepositoryPath(path: string): string {
    return path
      .split("/")
      .filter((part) => part.length > 0)
      .map((part) => GraphqlSkillPresenter.encodePathSegment(part))
      .join("/");
  }

  private static encodePathSegment(value: string): string {
    return encodeURIComponent(value);
  }
}
