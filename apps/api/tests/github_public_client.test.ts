import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { Config } from "../src/config/schema.ts";
import { SkillGithubPublicClient } from "../src/services/skills/github/public_client.ts";
import { SkillGithubRepositoryReference } from "../src/services/skills/github/repository_reference.ts";

type GitCall = {
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

function createClientMock(input: {
  gitCommandRunner: (call: GitCall) => Promise<{ stderr?: string; stdout?: string }>;
  removedDirectories?: string[];
  tempDirectory?: string;
}) {
  return new SkillGithubPublicClient({} as Config, {
    gitCommandRunner: async (args, options) => {
      const result = await input.gitCommandRunner({
        args,
        cwd: options.cwd,
        env: options.env,
      });
      return {
        stderr: result.stderr ?? "",
        stdout: result.stdout ?? "",
      };
    },
    makeTempDirectory: async () => input.tempDirectory ?? "/tmp/companyhelm-git-skills-test",
    removeDirectory: async (path) => {
      input.removedDirectories?.push(path);
    },
  });
}

test("SkillGithubRepositoryReference parses GitHub shorthand and generic HTTPS Git URLs", () => {
  const githubReference = SkillGithubRepositoryReference.parse("openai/skills");
  assert.equal(githubReference.owner, "openai");
  assert.equal(githubReference.repository, "skills");
  assert.equal(githubReference.remoteUrl, "https://github.com/openai/skills.git");
  assert.equal(githubReference.getFullName(), "openai/skills");

  const gitlabReference = SkillGithubRepositoryReference.parse("https://gitlab.com/acme/platform-skills.git");
  assert.equal(gitlabReference.owner, "acme");
  assert.equal(gitlabReference.repository, "platform-skills");
  assert.equal(gitlabReference.remoteUrl, "https://gitlab.com/acme/platform-skills.git");
  assert.equal(gitlabReference.getFullName(), "https://gitlab.com/acme/platform-skills");
});

test("SkillGithubRepositoryReference rejects unsafe Git repository URLs", () => {
  assert.throws(() => SkillGithubRepositoryReference.parse("file:///tmp/repo"), /Git repository/);
  assert.throws(() => SkillGithubRepositoryReference.parse("https://token@example.com/acme/repo.git"), /must not include credentials/);
  assert.throws(() => SkillGithubRepositoryReference.parse("openai/skills/tree/main"), /owner\/repository/);
  assert.throws(() => SkillGithubRepositoryReference.parse("https://github.com/openai/skills/tree/main"), /repository root/);
});

test("SkillGithubPublicClient lists branches with git ls-remote and does not create a checkout", async () => {
  const calls: GitCall[] = [];
  const removedDirectories: string[] = [];
  const client = createClientMock({
    removedDirectories,
    async gitCommandRunner(call) {
      calls.push(call);
      assert.equal(call.env?.GIT_TERMINAL_PROMPT, "0");
      if (call.args.join(" ") === "ls-remote --symref https://gitlab.com/acme/platform-skills.git HEAD") {
        return {
          stdout: "ref: refs/heads/main\tHEAD\ncommit-main\tHEAD\n",
        };
      }
      if (call.args.join(" ") === "ls-remote --heads https://gitlab.com/acme/platform-skills.git") {
        return {
          stdout: [
            "commit-dev\trefs/heads/dev",
            "commit-main\trefs/heads/main",
          ].join("\n"),
        };
      }

      throw new Error(`Unexpected git command: ${call.args.join(" ")}`);
    },
  });

  const branches = await client.getRepositoryBranches("https://gitlab.com/acme/platform-skills.git");

  assert.deepEqual(branches, {
    branches: [{
      commitSha: "commit-main",
      isDefault: true,
      name: "main",
    }, {
      commitSha: "commit-dev",
      isDefault: false,
      name: "dev",
    }],
    repository: "https://gitlab.com/acme/platform-skills",
  });
  assert.deepEqual(removedDirectories, []);
  assert.equal(calls.some((call) => call.args[0] === "fetch"), false);
});

test("SkillGithubPublicClient inspects a repository through one temporary shallow checkout", async () => {
  const calls: GitCall[] = [];
  const removedDirectories: string[] = [];
  const client = createClientMock({
    removedDirectories,
    tempDirectory: "/tmp/companyhelm-git-skills-test-123",
    async gitCommandRunner(call) {
      calls.push(call);
      assert.equal(call.env?.GIT_TERMINAL_PROMPT, "0");
      const command = call.args.join(" ");
      if (command === "init") {
        assert.equal(call.cwd, "/tmp/companyhelm-git-skills-test-123");
        return {};
      }
      if (command === "remote add origin https://github.com/openai/skills.git") {
        assert.equal(call.cwd, "/tmp/companyhelm-git-skills-test-123");
        return {};
      }
      if (command === "fetch --depth=1 --filter=blob:none origin main") {
        assert.equal(call.cwd, "/tmp/companyhelm-git-skills-test-123");
        return {};
      }
      if (command === "rev-parse FETCH_HEAD") {
        return {
          stdout: "commit-sha-1\n",
        };
      }
      if (command === "ls-tree -r --full-tree FETCH_HEAD") {
        return {
          stdout: [
            "100644 blob 1111111111111111111111111111111111111111\tskills/browser/SKILL.md",
            "100755 blob 2222222222222222222222222222222222222222\tskills/browser/scripts/open.sh",
          ].join("\n"),
        };
      }
      if (command === "show FETCH_HEAD:skills/browser/SKILL.md") {
        return {
          stdout: "---\ndescription: Browser automation guidance\n---\n\nRead SKILL.md first.\n",
        };
      }

      throw new Error(`Unexpected git command: ${command}`);
    },
  });

  const result = await client.inspectRepository("openai/skills", "main", async (snapshot) => ({
    file: await snapshot.readFile("skills/browser/SKILL.md"),
    tree: {
      branchName: snapshot.branchName,
      commitSha: snapshot.commitSha,
      repository: snapshot.repository,
      treeEntries: snapshot.treeEntries,
    },
  }));

  assert.deepEqual(result.tree, {
    branchName: "main",
    commitSha: "commit-sha-1",
    repository: "openai/skills",
    treeEntries: [{
      path: "skills/browser/scripts/open.sh",
      sha: "2222222222222222222222222222222222222222",
      type: "blob",
    }, {
      path: "skills/browser/SKILL.md",
      sha: "1111111111111111111111111111111111111111",
      type: "blob",
    }],
  });
  assert.equal(result.file, "---\ndescription: Browser automation guidance\n---\n\nRead SKILL.md first.\n");
  assert.deepEqual(removedDirectories, ["/tmp/companyhelm-git-skills-test-123"]);
  assert.deepEqual(
    calls.map((call) => call.args[0]),
    ["init", "remote", "fetch", "rev-parse", "ls-tree", "show"],
  );
});

test("SkillGithubPublicClient removes the temporary checkout when git fails", async () => {
  const removedDirectories: string[] = [];
  const client = createClientMock({
    removedDirectories,
    async gitCommandRunner(call) {
      if (call.args[0] === "fetch") {
        throw new Error("remote rejected fetch");
      }

      return {};
    },
  });

  await assert.rejects(async () => {
    await client.getRepositoryTree("openai/skills", "main");
  }, /Git request failed while trying to read the Git repository: remote rejected fetch/);
  assert.deepEqual(removedDirectories, ["/tmp/companyhelm-git-skills-test"]);
});
