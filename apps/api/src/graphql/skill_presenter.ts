import type { SkillGroupRecord, SkillRecord } from "../services/skills/service.ts";
import { SkillGithubRepositoryReference } from "../services/skills/github/repository_reference.ts";
import type { SystemCommandDefinition } from "../services/skills/system_command_catalog.ts";

export type GraphqlSkillFileInventoryEntry = {
  path: string;
  url: string | null;
};

export type GraphqlSkillRecord = {
  autoUpdate: boolean;
  branchCommitSha: string | null;
  companyId: string;
  description: string;
  fileInventory: GraphqlSkillFileInventoryEntry[];
  fileList: string[];
  branchName: string | null;
  branchSkillFileUrl: string | null;
  trackedCommitSkillFileUrl: string | null;
  trackedCommitSha: string | null;
  githubRepositoryId: string | null;
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  repositoryUrl: string | null;
  skillDirectory: string | null;
  skillDirectoryUrl: string | null;
  skillGroupId: string | null;
  sourceType: string;
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
      autoUpdate: record.autoUpdate ?? false,
      branchCommitSha: record.branchCommitSha ?? null,
      companyId: record.companyId,
      description: record.description,
      fileInventory: record.fileList.map((filePath) => ({
        path: filePath,
        url: githubSource && record.trackedCommitSha
          ? GraphqlSkillPresenter.buildGithubSourceUrl(
            githubSource.repositoryUrl,
            "blob",
            record.trackedCommitSha,
            filePath,
          )
          : null,
      })),
      fileList: [...record.fileList],
      branchName: record.branchName,
      branchSkillFileUrl: githubSource && record.branchName && record.skillDirectory
        ? GraphqlSkillPresenter.buildGithubSourceUrl(
          githubSource.repositoryUrl,
          "blob",
          record.branchName,
          GraphqlSkillPresenter.joinRepositoryPath(record.skillDirectory, "SKILL.md"),
        )
        : null,
      trackedCommitSkillFileUrl: githubSource && record.trackedCommitSha && record.skillDirectory
        ? GraphqlSkillPresenter.buildGithubSourceUrl(
          githubSource.repositoryUrl,
          "blob",
          record.trackedCommitSha,
          GraphqlSkillPresenter.joinRepositoryPath(record.skillDirectory, "SKILL.md"),
        )
        : null,
      trackedCommitSha: record.trackedCommitSha,
      githubRepositoryId: record.githubRepositoryId,
      id: record.id,
      instructions: record.instructions,
      name: record.name,
      repository: record.repository,
      repositoryUrl: githubSource?.repositoryUrl ?? null,
      skillDirectory: record.skillDirectory,
      skillDirectoryUrl: githubSource && record.trackedCommitSha && record.skillDirectory
        ? GraphqlSkillPresenter.buildGithubSourceUrl(
          githubSource.repositoryUrl,
          "tree",
          record.trackedCommitSha,
          record.skillDirectory,
        )
        : null,
      skillGroupId: record.skillGroupId,
      sourceType: record.sourceType,
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
