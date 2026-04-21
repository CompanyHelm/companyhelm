import assert from "node:assert/strict";
import { test } from "vitest";
import { SkillManagementSystemCommandService } from "../src/services/system_commands/skill_management.ts";

const context = {
  agentId: "agent-1",
  companyId: "company-123",
  sessionId: "session-1",
  transactionProvider: {},
};

test("SkillManagementSystemCommandService lists skill groups and skills", async () => {
  const service = new SkillManagementSystemCommandService({
    async listSkillGroups(_transactionProvider: unknown, companyId: string) {
      assert.equal(companyId, "company-123");
      return [{
        companyId,
        id: "group-1",
        name: "Research",
      }];
    },
    async listSkills(_transactionProvider: unknown, companyId: string) {
      assert.equal(companyId, "company-123");
      return [{
        companyId,
        description: "Research guidance",
        fileList: [],
        githubBranchName: null,
        githubTrackedCommitSha: null,
        id: "skill-1",
        instructions: "Read context first.",
        name: "Research",
        repository: null,
        skillDirectory: null,
        skillGroupId: "group-1",
      }];
    },
  } as never);

  const result = await service.execute("skill.list", {}, context as never);

  assert.deepEqual(result, {
    skillGroups: [{
      companyId: "company-123",
      id: "group-1",
      name: "Research",
    }],
    skills: [{
      companyId: "company-123",
      description: "Research guidance",
      fileList: [],
      githubBranchName: null,
      githubTrackedCommitSha: null,
      id: "skill-1",
      instructions: "Read context first.",
      name: "Research",
      repository: null,
      skillDirectory: null,
      skillGroupId: "group-1",
    }],
  });
});

test("SkillManagementSystemCommandService creates manual skills", async () => {
  const service = new SkillManagementSystemCommandService({
    async createSkill(_transactionProvider: unknown, input: {
      companyId: string;
      description: string;
      instructions: string;
      name: string;
      skillGroupId?: string | null;
    }) {
      assert.deepEqual(input, {
        companyId: "company-123",
        description: "Reusable QA guidance",
        instructions: "Open the checklist first.",
        name: "QA checklist",
        skillGroupId: "group-qa",
      });
      return {
        ...input,
        fileList: [],
        githubBranchName: null,
        githubTrackedCommitSha: null,
        id: "skill-created",
        repository: null,
        skillDirectory: null,
      };
    },
  } as never);

  const result = await service.execute("skill.create", {
    description: "Reusable QA guidance",
    instructions: "Open the checklist first.",
    name: "QA checklist",
    skillGroupId: "group-qa",
  }, context as never);

  assert.equal((result.skill as Record<string, unknown>).id, "skill-created");
});

test("SkillManagementSystemCommandService imports Git-backed skills", async () => {
  const service = new SkillManagementSystemCommandService({} as never, {
    async importSkills(_transactionProvider: unknown, input: {
      companyId: string;
      skillGroupId?: string | null;
      skills: Array<{
        branchName: string;
        repository: string;
        skillDirectory: string;
      }>;
    }) {
      assert.deepEqual(input, {
        companyId: "company-123",
        skillGroupId: null,
        skills: [{
          branchName: "main",
          repository: "companyhelm/skills",
          skillDirectory: "skills/browser",
        }],
      });
      return [{
        companyId: input.companyId,
        description: "Browser guidance",
        fileList: ["skills/browser/scripts/open.sh"],
        githubBranchName: "main",
        githubTrackedCommitSha: "commit-sha-1",
        id: "skill-imported",
        instructions: "Use the browser.",
        name: "Browser",
        repository: "companyhelm/skills",
        skillDirectory: "skills/browser",
        skillGroupId: null,
      }];
    },
  } as never);

  const result = await service.execute("skill.github.import", {
    skillGroupId: null,
    skills: [{
      branchName: "main",
      repository: "companyhelm/skills",
      skillDirectory: "skills/browser",
    }],
  }, context as never);

  assert.deepEqual(result.skills, [{
    companyId: "company-123",
    description: "Browser guidance",
    fileList: ["skills/browser/scripts/open.sh"],
    githubBranchName: "main",
    githubTrackedCommitSha: "commit-sha-1",
    id: "skill-imported",
    instructions: "Use the browser.",
    name: "Browser",
    repository: "companyhelm/skills",
    skillDirectory: "skills/browser",
    skillGroupId: null,
  }]);
});

test("SkillManagementSystemCommandService updates and deletes skill groups", async () => {
  const calls: string[] = [];
  const service = new SkillManagementSystemCommandService({
    async updateSkillGroup(_transactionProvider: unknown, input: {
      companyId: string;
      name?: string | null;
      skillGroupId: string;
    }) {
      calls.push("update");
      assert.deepEqual(input, {
        companyId: "company-123",
        name: "Docs",
        skillGroupId: "group-1",
      });
      return {
        companyId: input.companyId,
        id: input.skillGroupId,
        name: input.name,
      };
    },
    async deleteSkillGroup(_transactionProvider: unknown, input: {
      companyId: string;
      skillGroupId: string;
    }) {
      calls.push("delete");
      assert.deepEqual(input, {
        companyId: "company-123",
        skillGroupId: "group-1",
      });
      return {
        companyId: input.companyId,
        id: input.skillGroupId,
        name: "Docs",
      };
    },
  } as never);

  await service.execute("skill.group.update", {
    name: "Docs",
    skillGroupId: "group-1",
  }, context as never);
  await service.execute("skill.group.delete", {
    skillGroupId: "group-1",
  }, context as never);

  assert.deepEqual(calls, ["update", "delete"]);
});
