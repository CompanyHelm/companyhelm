import assert from "node:assert/strict";
import { test } from "vitest";
import { GraphqlSkillPresenter } from "../src/graphql/skill_presenter.ts";
import type { SkillRecord } from "../src/services/skills/service.ts";

/**
 * Builds complete skill records for presenter tests so each case can focus on source metadata
 * without repeating unrelated editable skill fields.
 */
class SkillPresenterTestRecordFactory {
  static create(input: Partial<SkillRecord> = {}): SkillRecord {
    return {
      companyId: "company-123",
      description: "Use browser automation helpers.",
      fileList: [],
      branchName: null,
      trackedCommitSha: null,
      githubRepositoryId: null,
      id: "skill-123",
      instructions: "Read the instructions before using the helpers.",
      name: "Browser helpers",
      repository: null,
      skillDirectory: null,
      skillGroupId: null,
      sourceType: "manual",
      skillType: "custom",
      systemCommands: [],
      systemKey: null,
      ...input,
    };
  }
}

test("GraphqlSkillPresenter builds GitHub source links for repository-backed skills", () => {
  const skill = SkillPresenterTestRecordFactory.create({
    fileList: [
      "skills/browser/scripts/open.sh",
      "skills/browser/references/Usage Guide.md",
    ],
    branchName: "main",
    trackedCommitSha: "abc123",
    repository: "companyhelm/skills",
    skillDirectory: "skills/browser",
    sourceType: "public_git",
  });

  const presentedSkill = GraphqlSkillPresenter.presentSkill(skill);

  assert.equal(presentedSkill.repositoryUrl, "https://github.com/companyhelm/skills");
  assert.equal(
    presentedSkill.branchSkillFileUrl,
    "https://github.com/companyhelm/skills/blob/main/skills/browser/SKILL.md",
  );
  assert.equal(
    presentedSkill.trackedCommitSkillFileUrl,
    "https://github.com/companyhelm/skills/blob/abc123/skills/browser/SKILL.md",
  );
  assert.equal(
    presentedSkill.skillDirectoryUrl,
    "https://github.com/companyhelm/skills/tree/abc123/skills/browser",
  );
  assert.deepEqual(presentedSkill.fileInventory, [{
    path: "skills/browser/scripts/open.sh",
    url: "https://github.com/companyhelm/skills/blob/abc123/skills/browser/scripts/open.sh",
  }, {
    path: "skills/browser/references/Usage Guide.md",
    url: "https://github.com/companyhelm/skills/blob/abc123/skills/browser/references/Usage%20Guide.md",
  }]);
});

test("GraphqlSkillPresenter omits source links for non-GitHub repositories", () => {
  const skill = SkillPresenterTestRecordFactory.create({
    fileList: ["skills/browser/scripts/open.sh"],
    branchName: "main",
    trackedCommitSha: "abc123",
    repository: "https://gitlab.com/companyhelm/skills",
    skillDirectory: "skills/browser",
    sourceType: "public_git",
  });

  const presentedSkill = GraphqlSkillPresenter.presentSkill(skill);

  assert.equal(presentedSkill.repositoryUrl, null);
  assert.equal(presentedSkill.branchSkillFileUrl, null);
  assert.equal(presentedSkill.trackedCommitSkillFileUrl, null);
  assert.equal(presentedSkill.skillDirectoryUrl, null);
  assert.deepEqual(presentedSkill.fileInventory, [{
    path: "skills/browser/scripts/open.sh",
    url: null,
  }]);
});
