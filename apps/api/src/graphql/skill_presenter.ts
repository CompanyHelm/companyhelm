import type { SkillGroupRecord, SkillRecord } from "../services/skills/service.ts";
import type { SystemCommandDefinition } from "../services/skills/system_command_catalog.ts";

export type GraphqlSkillRecord = {
  companyId: string;
  description: string;
  fileList: string[];
  githubBranchName: string | null;
  githubTrackedCommitSha: string | null;
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
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
    return {
      companyId: record.companyId,
      description: record.description,
      fileList: [...record.fileList],
      githubBranchName: record.githubBranchName,
      githubTrackedCommitSha: record.githubTrackedCommitSha,
      id: record.id,
      instructions: record.instructions,
      name: record.name,
      repository: record.repository,
      skillDirectory: record.skillDirectory,
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
}
