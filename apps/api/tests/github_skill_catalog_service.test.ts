import assert from "node:assert/strict";
import { test } from "vitest";
import { skill_groups, skills } from "../src/db/schema.ts";
import { SkillGithubCatalog } from "../src/services/skills/github/catalog.ts";

type MockSkillGroupRecord = {
  id: string;
};

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

type MockRepositorySnapshot = {
  branchName: string;
  commitSha: string;
  readFile(path: string): Promise<string>;
  repository: string;
  treeEntries: Array<{
    path: string;
    sha: string;
    type: "blob";
  }>;
};

type InspectRepositoryCallback = (snapshot: MockRepositorySnapshot) => Promise<unknown>;

class GithubSkillCatalogServiceTestHarness {
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

test("SkillGithubCatalog discovers public repository branches", async () => {
  const catalog = new SkillGithubCatalog({
    async getRepositoryBranches() {
      return {
        branches: [{
          commitSha: "commit-sha-main",
          isDefault: true,
          name: "main",
        }, {
          commitSha: "commit-sha-release",
          isDefault: false,
          name: "release",
        }],
        repository: "openai/skills",
      };
    },
  } as never);

  const discoveredBranches = await catalog.discoverBranches("https://github.com/openai/skills");

  assert.deepEqual(discoveredBranches, [{
    commitSha: "commit-sha-main",
    isDefault: true,
    name: "main",
    repository: "openai/skills",
  }, {
    commitSha: "commit-sha-release",
    isDefault: false,
    name: "release",
    repository: "openai/skills",
  }]);
});

test("SkillGithubCatalog discovers SKILL.md files from a public repository tree", async () => {
  const catalog = new SkillGithubCatalog({
    async inspectRepository(
      _repository: string,
      _branchName: string | undefined,
      callback: InspectRepositoryCallback,
    ) {
      return callback({
        branchName: "main",
        commitSha: "commit-sha-1",
        repository: "openai/skills",
        treeEntries: [{
          path: "skills/browser/SKILL.md",
          sha: "blob-skill",
          type: "blob" as const,
        }, {
          path: "skills/browser/scripts/open.sh",
          sha: "blob-script",
          type: "blob" as const,
        }],
        async readFile() {
          return [
            "---",
            "description: Browser automation guidance",
            "---",
            "",
            "Read SKILL.md first.",
          ].join("\n");
        },
      });
    },
  } as never);

  const discoveredSkills = await catalog.discoverSkills({
    branchName: "main",
    repository: "https://github.com/openai/skills",
  });

  assert.deepEqual(discoveredSkills, [{
    branchName: "main",
    commitSha: "commit-sha-1",
    description: "Browser automation guidance",
    fileList: ["skills/browser/scripts/open.sh"],
    importable: true,
    instructions: "Read SKILL.md first.",
    name: "browser",
    repository: "openai/skills",
    skillDirectory: "skills/browser",
    validationError: null,
  }]);
});

test("SkillGithubCatalog imports selected Git skills by resolving their content server-side", async () => {
  const transactionProvider = GithubSkillCatalogServiceTestHarness.createTransactionProvider({
    groups: [{
      id: "group-1",
    }],
    skills: [],
  });
  let repositoryInspectCount = 0;
  let skillFileReadCount = 0;
  const catalog = new SkillGithubCatalog({
    async inspectRepository(
      _repository: string,
      _branchName: string | undefined,
      callback: InspectRepositoryCallback,
    ) {
      repositoryInspectCount += 1;
      return callback({
        branchName: "main",
        commitSha: "commit-sha-2",
        repository: "openai/skills",
        treeEntries: [{
          path: "skills/browser/SKILL.md",
          sha: "blob-skill",
          type: "blob" as const,
        }, {
          path: "skills/browser/scripts/open.sh",
          sha: "blob-script",
          type: "blob" as const,
        }],
        async readFile() {
          skillFileReadCount += 1;
          return [
            "---",
            "name: Browser automation",
            "description: Browser automation guidance",
            "---",
            "",
            "Read SKILL.md first.",
          ].join("\n");
        },
      });
    },
  } as never);

  const [createdSkill] = await catalog.importSkills(transactionProvider as never, {
    companyId: "company-1",
    skillGroupId: "group-1",
    skills: [{
      branchName: "main",
      repository: "openai/skills",
      skillDirectory: "skills/browser",
    }],
  });

  assert.equal(createdSkill.githubBranchName, "main");
  assert.equal(createdSkill.githubTrackedCommitSha, "commit-sha-2");
  assert.equal(createdSkill.repository, "openai/skills");
  assert.equal(createdSkill.skillDirectory, "skills/browser");
  assert.equal(createdSkill.name, "Browser automation");
  assert.deepEqual(transactionProvider.skillRecords[0]?.fileList, ["skills/browser/scripts/open.sh"]);
  assert.equal(repositoryInspectCount, 1);
  assert.equal(skillFileReadCount, 1);
});
