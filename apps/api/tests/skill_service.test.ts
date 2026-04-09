import assert from "node:assert/strict";
import { test } from "vitest";
import { skill_groups, skills } from "../src/db/schema.ts";
import { SkillService } from "../src/services/skills/service.ts";

type MockSkillRecord = {
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
        if (table !== skills) {
          throw new Error("Unexpected insert table.");
        }

        return {
          values(value: Record<string, unknown>) {
            const createdSkill: MockSkillRecord = {
              companyId: String(value.companyId),
              description: String(value.description),
              fileList: [...(value.fileList as string[])],
              id: `skill-${skillRecords.length + 1}`,
              instructions: String(value.instructions),
              name: String(value.name),
              repository: null,
              skillDirectory: null,
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
