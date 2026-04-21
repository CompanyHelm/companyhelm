import assert from "node:assert/strict";
import { test } from "vitest";
import { githubRepositories, skill_groups, skills } from "../src/db/schema.ts";
import { SkillGithubCatalog } from "../src/services/skills/github/catalog.ts";

type MockSkillGroupRecord = {
  id: string;
};

type MockSkillRecord = {
  companyId: string;
  description: string;
  fileList: string[];
  branchName: string | null;
  trackedCommitSha: string | null;
  branchCommitSha?: string | null;
  autoUpdate?: boolean;
  githubRepositoryId: string | null;
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillGroupId: string | null;
  sourceType: "manual" | "public_git" | "github_installation";
};

type MockGithubRepositoryRecord = {
  archived: boolean;
  defaultBranch: string | null;
  fullName: string;
  id: string;
  installationId: number;
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
    repositories?: MockGithubRepositoryRecord[];
    skills: MockSkillRecord[];
  }) {
    const groups = [...input.groups];
    const repositories = [...(input.repositories ?? [])];
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
              branchName: value.branchName ? String(value.branchName) : null,
              trackedCommitSha: value.trackedCommitSha ? String(value.trackedCommitSha) : null,
              branchCommitSha: value.branchCommitSha ? String(value.branchCommitSha) : null,
              autoUpdate: value.autoUpdate === undefined ? false : Boolean(value.autoUpdate),
              githubRepositoryId: value.githubRepositoryId ? String(value.githubRepositoryId) : null,
              id: `skill-${skillRecords.length + 1}`,
              instructions: String(value.instructions),
              name: String(value.name),
              repository: value.repository ? String(value.repository) : null,
              skillDirectory: value.skillDirectory ? String(value.skillDirectory) : null,
              skillGroupId: value.skillGroupId ? String(value.skillGroupId) : null,
              sourceType: String(value.sourceType || "manual") as MockSkillRecord["sourceType"],
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
                if (table === githubRepositories) {
                  return [...repositories];
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
      repositories,
      skillRecords,
    };
  }
}

test("SkillGithubCatalog discovers public repository branches", async () => {
  const transactionProvider = GithubSkillCatalogServiceTestHarness.createTransactionProvider({
    groups: [],
    skills: [],
  });
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

  const discoveredBranches = await catalog.discoverBranches(transactionProvider as never, {
    companyId: "company-1",
    source: {
      repository: "https://github.com/openai/skills",
      sourceType: "public_git",
    },
  });

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
  const transactionProvider = GithubSkillCatalogServiceTestHarness.createTransactionProvider({
    groups: [],
    skills: [],
  });
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

  const discoveredSkills = await catalog.discoverSkills(transactionProvider as never, {
    branchName: "main",
    companyId: "company-1",
    source: {
      repository: "https://github.com/openai/skills",
      sourceType: "public_git",
    },
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

test("SkillGithubCatalog discovers branches from installed private repositories", async () => {
  const transactionProvider = GithubSkillCatalogServiceTestHarness.createTransactionProvider({
    groups: [],
    repositories: [{
      archived: false,
      defaultBranch: "main",
      fullName: "companyhelm/private-skills",
      id: "repository-1",
      installationId: 12345,
    }],
    skills: [],
  });
  let branchListInput: Record<string, unknown> | null = null;
  const catalog = new SkillGithubCatalog({} as never, {
    async listRepositoryBranches(input: Record<string, unknown>) {
      branchListInput = input;
      return [{
        commitSha: "commit-sha-main",
        isDefault: true,
        name: "main",
        repositoryFullName: "companyhelm/private-skills",
      }];
    },
  } as never);

  const discoveredBranches = await catalog.discoverBranches(transactionProvider as never, {
    companyId: "company-1",
    source: {
      githubRepositoryId: "repository-1",
      sourceType: "github_installation",
    },
  });

  assert.deepEqual(branchListInput, {
    defaultBranch: "main",
    installationId: 12345,
    repositoryFullName: "companyhelm/private-skills",
  });
  assert.deepEqual(discoveredBranches, [{
    commitSha: "commit-sha-main",
    isDefault: true,
    name: "main",
    repository: "companyhelm/private-skills",
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
      source: {
        repository: "openai/skills",
        sourceType: "public_git",
      },
      skillDirectory: "skills/browser",
    }],
  });

  assert.equal(createdSkill.branchName, "main");
  assert.equal(createdSkill.trackedCommitSha, "commit-sha-2");
  assert.equal(createdSkill.branchCommitSha, "commit-sha-2");
  assert.equal(createdSkill.autoUpdate, true);
  assert.equal(createdSkill.repository, "openai/skills");
  assert.equal(createdSkill.skillDirectory, "skills/browser");
  assert.equal(createdSkill.name, "Browser automation");
  assert.deepEqual(transactionProvider.skillRecords[0]?.fileList, ["skills/browser/scripts/open.sh"]);
  assert.equal(repositoryInspectCount, 1);
  assert.equal(skillFileReadCount, 1);
});

test("SkillGithubCatalog imports selected private GitHub installation skills", async () => {
  const transactionProvider = GithubSkillCatalogServiceTestHarness.createTransactionProvider({
    groups: [{
      id: "group-1",
    }],
    repositories: [{
      archived: false,
      defaultBranch: "main",
      fullName: "companyhelm/private-skills",
      id: "repository-1",
      installationId: 12345,
    }],
    skills: [],
  });
  let packageInput: Record<string, unknown> | null = null;
  const catalog = new SkillGithubCatalog({} as never, {
    async getSkillPackage(input: Record<string, unknown>) {
      packageInput = input;
      return {
        branchName: "main",
        commitSha: "commit-sha-private",
        description: "Private browser guidance",
        fileList: ["scripts/open.sh"],
        instructions: "Use the private browser helpers.",
        name: "Private browser",
        path: "skills/browser",
        repositoryFullName: "companyhelm/private-skills",
      };
    },
  } as never);

  const [createdSkill] = await catalog.importSkills(transactionProvider as never, {
    companyId: "company-1",
    skillGroupId: "group-1",
    skills: [{
      branchName: "main",
      skillDirectory: "skills/browser",
      source: {
        githubRepositoryId: "repository-1",
        sourceType: "github_installation",
      },
    }],
  });

  assert.deepEqual(packageInput, {
    branchName: "main",
    installationId: 12345,
    repositoryFullName: "companyhelm/private-skills",
    skillDirectory: "skills/browser",
  });
  assert.equal(createdSkill.githubRepositoryId, "repository-1");
  assert.equal(createdSkill.repository, "companyhelm/private-skills");
  assert.equal(createdSkill.sourceType, "github_installation");
  assert.equal(createdSkill.trackedCommitSha, "commit-sha-private");
  assert.equal(createdSkill.branchCommitSha, "commit-sha-private");
  assert.equal(createdSkill.autoUpdate, true);
  assert.equal(transactionProvider.skillRecords[0]?.repository, null);
  assert.equal(transactionProvider.skillRecords[0]?.githubRepositoryId, "repository-1");
  assert.equal(transactionProvider.skillRecords[0]?.sourceType, "github_installation");
  assert.deepEqual(transactionProvider.skillRecords[0]?.fileList, ["skills/browser/scripts/open.sh"]);
});
