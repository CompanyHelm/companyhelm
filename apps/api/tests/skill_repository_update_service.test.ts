import assert from "node:assert/strict";
import { test } from "vitest";
import { SkillRepositoryUpdateService } from "../src/services/skills/repository_update_service.ts";
import type { SkillRecord } from "../src/services/skills/service.ts";

type UpdateMetadataInput = {
  branchCommitSha: string;
  branchName: string;
  companyId: string;
  description: string;
  fileList: string[];
  instructions: string;
  name: string;
  skillDirectory: string;
  skillId: string;
  trackedCommitSha: string;
};

class SkillRepositoryUpdateServiceTestHarness {
  skill: SkillRecord;
  readonly branchCommitLookups: string[] = [];
  readonly metadataUpdates: UpdateMetadataInput[] = [];

  constructor(skill: SkillRecord) {
    this.skill = { ...skill };
  }

  createService(): SkillRepositoryUpdateService {
    return new SkillRepositoryUpdateService(
      {} as never,
      {} as never,
      {
        getLogger: () => ({
          warn() {},
        }),
      } as never,
      {
        getSkill: async () => {
          return { ...this.skill };
        },
        listSkills: async () => {
          return [{ ...this.skill }];
        },
        updateRepositorySkillBranchCommitSha: async (
          _transactionProvider: unknown,
          input: {
            branchCommitSha: string;
          },
        ) => {
          this.skill = {
            ...this.skill,
            branchCommitSha: input.branchCommitSha,
          };
          return { ...this.skill };
        },
        updateRepositorySkillMetadata: async (
          _transactionProvider: unknown,
          input: UpdateMetadataInput,
        ) => {
          this.metadataUpdates.push(input);
          this.skill = {
            ...this.skill,
            branchCommitSha: input.branchCommitSha,
            branchName: input.branchName,
            description: input.description,
            fileList: [...input.fileList],
            instructions: input.instructions,
            name: input.name,
            skillDirectory: input.skillDirectory,
            trackedCommitSha: input.trackedCommitSha,
          };
          return { ...this.skill };
        },
      } as never,
      {
        resolveBranchCommitSha: async (_transactionProvider: unknown, input: { branchName: string }) => {
          this.branchCommitLookups.push(input.branchName);
          return {
            branchName: input.branchName,
            commitSha: "new-sha",
            repository: "openai/skills",
          };
        },
        resolveSkillPackage: async () => {
          return {
            branchName: "main",
            commitSha: "new-sha",
            description: "Updated browser guidance",
            fileList: ["skills/browser/scripts/open.sh", "skills/browser/references/browser.md"],
            githubRepositoryId: null,
            githubRepositoryInstallationId: null,
            instructions: "Use the updated browser flow.",
            name: "Browser automation",
            repository: "openai/skills",
            skillDirectory: "skills/browser",
            sourceType: "public_git",
          };
        },
      } as never,
    );
  }

  static createRepositorySkill(input: {
    autoUpdate: boolean;
    branchCommitSha: string;
    trackedCommitSha: string;
  }): SkillRecord {
    return {
      autoUpdate: input.autoUpdate,
      branchCommitSha: input.branchCommitSha,
      branchName: "main",
      companyId: "company-1",
      description: "Browser guidance",
      fileList: ["skills/browser/scripts/open.sh"],
      githubRepositoryId: null,
      id: "skill-1",
      instructions: "Use the browser flow.",
      name: "Browser",
      repository: "openai/skills",
      skillDirectory: "skills/browser",
      skillGroupId: null,
      sourceType: "public_git",
      trackedCommitSha: input.trackedCommitSha,
    };
  }
}

test("SkillRepositoryUpdateService refreshes branch sha and auto-updates enabled skills", async () => {
  const harness = new SkillRepositoryUpdateServiceTestHarness(
    SkillRepositoryUpdateServiceTestHarness.createRepositorySkill({
      autoUpdate: true,
      branchCommitSha: "old-sha",
      trackedCommitSha: "old-sha",
    }),
  );

  const result = await harness.createService().updateCompanySkills({} as never, "company-1");

  assert.deepEqual(result, {
    autoUpdatedSkills: 1,
    checkedSkills: 1,
    failedSkills: 0,
    refreshedBranchCommits: 1,
    skippedBecauseLocked: false,
  });
  assert.deepEqual(harness.branchCommitLookups, ["main"]);
  assert.equal(harness.metadataUpdates.length, 1);
  assert.equal(harness.skill.trackedCommitSha, "new-sha");
  assert.deepEqual(harness.skill.fileList, [
    "skills/browser/scripts/open.sh",
    "skills/browser/references/browser.md",
  ]);
});

test("SkillRepositoryUpdateService leaves metadata untouched when auto-update is disabled", async () => {
  const harness = new SkillRepositoryUpdateServiceTestHarness(
    SkillRepositoryUpdateServiceTestHarness.createRepositorySkill({
      autoUpdate: false,
      branchCommitSha: "old-sha",
      trackedCommitSha: "old-sha",
    }),
  );

  const result = await harness.createService().updateCompanySkills({} as never, "company-1");

  assert.equal(result.refreshedBranchCommits, 1);
  assert.equal(result.autoUpdatedSkills, 0);
  assert.equal(harness.skill.branchCommitSha, "new-sha");
  assert.equal(harness.skill.trackedCommitSha, "old-sha");
  assert.equal(harness.metadataUpdates.length, 0);
});

test("SkillRepositoryUpdateService update now refreshes even when auto-update is disabled", async () => {
  const harness = new SkillRepositoryUpdateServiceTestHarness(
    SkillRepositoryUpdateServiceTestHarness.createRepositorySkill({
      autoUpdate: false,
      branchCommitSha: "old-sha",
      trackedCommitSha: "old-sha",
    }),
  );

  const skill = await harness.createService().updateSkillNow({} as never, "company-1", "skill-1");

  assert.equal(skill.trackedCommitSha, "new-sha");
  assert.equal(harness.metadataUpdates.length, 1);
});
