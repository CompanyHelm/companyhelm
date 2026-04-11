import assert from "node:assert/strict";
import { test } from "vitest";
import { skill_groups, skills } from "../src/db/schema.ts";
import { SkillService } from "../src/services/skills/service.ts";

type MockSkillRecord = {
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
};

type MockSkillGroupRecord = {
  companyId: string;
  id: string;
  name: string;
};

class SkillServiceTestHarness {
  static createTransactionProvider(input: {
    groups: MockSkillGroupRecord[];
    skills: MockSkillRecord[];
  }) {
    const groups = [...input.groups];
    const skillRecords = [...input.skills];

    const database = {
      insert(table: unknown) {
        if (table === skills) {
          return {
            values(value: Record<string, unknown>) {
              const createdSkill: MockSkillRecord = {
                companyId: String(value.companyId),
                description: String(value.description),
                fileList: [...(value.fileList as string[])],
                githubBranchName: value.githubBranchName ? String(value.githubBranchName) : null,
                githubTrackedCommitSha: value.githubTrackedCommitSha ? String(value.githubTrackedCommitSha) : null,
                id: `skill-${skillRecords.length + 1}`,
                instructions: String(value.instructions),
                name: String(value.name),
                repository: value.repository ? String(value.repository) : null,
                skillDirectory: value.skillDirectory ? String(value.skillDirectory) : null,
                skillGroupId: value.skillGroupId ? String(value.skillGroupId) : null,
              };
              skillRecords.push(createdSkill);

              return {
                async returning() {
                  return [createdSkill];
                },
              };
            },
          };
        }
        if (table === skill_groups) {
          return {
            values(value: Record<string, unknown>) {
              const createdGroup: MockSkillGroupRecord = {
                companyId: String(value.companyId),
                id: `group-${groups.length + 1}`,
                name: String(value.name),
              };
              groups.push(createdGroup);

              return {
                async returning() {
                  return [createdGroup];
                },
              };
            },
          };
        }

        throw new Error("Unexpected insert table.");
      },
      select() {
        return {
          from(table: unknown) {
            return {
              async where(_condition: unknown) {
                void _condition;
                if (table === skills) {
                  return [...skillRecords];
                }
                if (table === skill_groups) {
                  return [...groups];
                }

                throw new Error("Unexpected select table.");
              },
            };
          },
        };
      },
      delete(table: unknown) {
        if (table === skill_groups) {
          return {
            where(_condition: unknown) {
              void _condition;
              return {
                async returning() {
                  const [deletedGroup] = groups.splice(0, 1);
                  if (!deletedGroup) {
                    return [];
                  }

                  for (const skillRecord of skillRecords) {
                    if (skillRecord.skillGroupId === deletedGroup.id) {
                      skillRecord.skillGroupId = null;
                    }
                  }

                  return [deletedGroup];
                },
              };
            },
          };
        }
        if (table === skills) {
          return {
            where(_condition: unknown) {
              void _condition;
              return {
                async returning() {
                  const [deletedSkill] = skillRecords.splice(0, 1);
                  return deletedSkill ? [deletedSkill] : [];
                },
              };
            },
          };
        }

        throw new Error("Unexpected delete table.");
      },
      update(table: unknown) {
        if (table !== skills) {
          throw new Error("Unexpected update table.");
        }

        return {
          set(value: Record<string, unknown>) {
            return {
              where(_condition: unknown) {
                void _condition;
                return {
                  async returning() {
                    const [targetSkill] = skillRecords;
                    if (!targetSkill) {
                      return [];
                    }

                    targetSkill.description = String(value.description);
                    targetSkill.instructions = String(value.instructions);
                    targetSkill.name = String(value.name);
                    targetSkill.skillGroupId = value.skillGroupId ? String(value.skillGroupId) : null;

                    return [targetSkill];
                  },
                };
              },
            };
          },
        };
      },
    };

    return {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback(database);
      },
      groups,
      skillRecords,
    };
  }
}

test("SkillService creates a skill group for the authenticated company", async () => {
  const transactionProvider = SkillServiceTestHarness.createTransactionProvider({
    groups: [],
    skills: [],
  });
  const service = new SkillService();

  const createdGroup = await service.createSkillGroup(transactionProvider as never, {
    companyId: "company-123",
    name: "Research",
  });

  assert.equal(createdGroup.name, "Research");
  assert.equal(transactionProvider.groups[0]?.name, "Research");
});

test("SkillService deletes a skill group and clears existing assignments", async () => {
  const transactionProvider = SkillServiceTestHarness.createTransactionProvider({
    groups: [{
      companyId: "company-123",
      id: "group-automation",
      name: "Automation",
    }],
    skills: [{
      companyId: "company-123",
      description: "Initial description",
      fileList: [],
      githubBranchName: null,
      githubTrackedCommitSha: null,
      id: "skill-1",
      instructions: "Initial instructions",
      name: "Browser skill",
      repository: null,
      skillDirectory: null,
      skillGroupId: "group-automation",
    }],
  });
  const service = new SkillService();

  const deletedGroup = await service.deleteSkillGroup(transactionProvider as never, {
    companyId: "company-123",
    skillGroupId: "group-automation",
  });

  assert.equal(deletedGroup.id, "group-automation");
  assert.equal(transactionProvider.groups.length, 0);
  assert.equal(transactionProvider.skillRecords[0]?.skillGroupId, null);
});

test("SkillService deletes one skill from the catalog", async () => {
  const transactionProvider = SkillServiceTestHarness.createTransactionProvider({
    groups: [],
    skills: [{
      companyId: "company-123",
      description: "Initial description",
      fileList: [],
      githubBranchName: null,
      githubTrackedCommitSha: null,
      id: "skill-1",
      instructions: "Initial instructions",
      name: "Browser skill",
      repository: null,
      skillDirectory: null,
      skillGroupId: null,
    }],
  });
  const service = new SkillService();

  const deletedSkill = await service.deleteSkill(transactionProvider as never, {
    companyId: "company-123",
    skillId: "skill-1",
  });

  assert.equal(deletedSkill.id, "skill-1");
  assert.equal(transactionProvider.skillRecords.length, 0);
});

test("SkillService updates the editable fields and clears the group assignment", async () => {
  const transactionProvider = SkillServiceTestHarness.createTransactionProvider({
    groups: [{
      companyId: "company-123",
      id: "group-automation",
      name: "Automation",
    }],
    skills: [{
      companyId: "company-123",
      description: "Initial description",
      fileList: [],
      githubBranchName: null,
      githubTrackedCommitSha: null,
      id: "skill-1",
      instructions: "Initial instructions",
      name: "Browser skill",
      repository: null,
      skillDirectory: null,
      skillGroupId: "group-automation",
    }],
  });
  const service = new SkillService();

  const updatedSkill = await service.updateSkill(transactionProvider as never, {
    companyId: "company-123",
    description: "Updated description",
    instructions: "Updated instructions",
    name: "Updated browser skill",
    skillGroupId: null,
    skillId: "skill-1",
  });

  assert.equal(updatedSkill.name, "Updated browser skill");
  assert.equal(updatedSkill.description, "Updated description");
  assert.equal(updatedSkill.instructions, "Updated instructions");
  assert.equal(updatedSkill.skillGroupId, null);
  assert.equal(transactionProvider.skillRecords[0]?.skillGroupId, null);
});

test("SkillService rejects unknown skill groups during creation", async () => {
  const transactionProvider = SkillServiceTestHarness.createTransactionProvider({
    groups: [],
    skills: [],
  });
  const service = new SkillService();

  await assert.rejects(async () => {
    await service.createSkill(transactionProvider as never, {
      companyId: "company-123",
      description: "Description",
      instructions: "Instructions",
      name: "Skill",
      skillGroupId: "missing-group",
    });
  }, /Skill group not found/);
});

test("SkillService creates a GitHub-backed skill with source metadata", async () => {
  const transactionProvider = SkillServiceTestHarness.createTransactionProvider({
    groups: [{
      companyId: "company-123",
      id: "group-automation",
      name: "Automation",
    }],
    skills: [],
  });
  const service = new SkillService();

  const createdSkill = await service.createGithubSkill(transactionProvider as never, {
    companyId: "company-123",
    description: "Use the browser helpers first.",
    fileList: ["scripts/open.sh", "templates/prompt.md"],
    githubBranchName: "main",
    githubTrackedCommitSha: "commit-sha-1",
    instructions: "# Browser automation\n\nUse the browser helpers first.",
    name: "Browser automation",
    repository: "companyhelm/skills",
    skillDirectory: "skills/browser",
    skillGroupId: "group-automation",
  });

  assert.equal(createdSkill.name, "Browser automation");
  assert.equal(createdSkill.repository, "companyhelm/skills");
  assert.equal(createdSkill.skillDirectory, "skills/browser");
  assert.equal(createdSkill.githubBranchName, "main");
  assert.equal(createdSkill.githubTrackedCommitSha, "commit-sha-1");
  assert.deepEqual(createdSkill.fileList, ["scripts/open.sh", "templates/prompt.md"]);
  assert.equal(transactionProvider.skillRecords[0]?.repository, "companyhelm/skills");
  assert.equal(transactionProvider.skillRecords[0]?.skillDirectory, "skills/browser");
  assert.equal(transactionProvider.skillRecords[0]?.githubTrackedCommitSha, "commit-sha-1");
});

test("SkillService requires a tracked commit sha for file-backed GitHub skills", async () => {
  const transactionProvider = SkillServiceTestHarness.createTransactionProvider({
    groups: [],
    skills: [],
  });
  const service = new SkillService();

  await assert.rejects(
    service.createGithubSkill(transactionProvider as never, {
      companyId: "company-123",
      description: "Imported from GitHub",
      fileList: ["skills/browser/scripts/open.sh"],
      instructions: "Read the imported skill instructions.",
      name: "Browser skill",
      repository: "companyhelm/skills",
      skillDirectory: "skills/browser",
    }),
    /GitHub tracked commit sha is required/,
  );
});
