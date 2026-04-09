import type { SkillGroupRecord, SkillRecord } from "../services/skills/service.ts";

export type GraphqlSkillRecord = {
  companyId: string;
  description: string;
  fileList: string[];
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillGroupId: string | null;
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
      id: record.id,
      instructions: record.instructions,
      name: record.name,
      repository: record.repository,
      skillDirectory: record.skillDirectory,
      skillGroupId: record.skillGroupId,
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
