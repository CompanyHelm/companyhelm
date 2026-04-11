import assert from "node:assert/strict";
import { test } from "vitest";
import { SkillGithubPublicClient } from "../src/services/skills/github/public_client.ts";
import { SkillGithubRepositoryReference } from "../src/services/skills/github/repository_reference.ts";

function createJsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });
}

test("SkillGithubRepositoryReference parses GitHub URLs into owner and repository segments", () => {
  const repositoryReference = SkillGithubRepositoryReference.parse("https://github.com/openai/skills.git");

  assert.equal(repositoryReference.owner, "openai");
  assert.equal(repositoryReference.repository, "skills");
  assert.equal(repositoryReference.getFullName(), "openai/skills");
});

test("SkillGithubPublicClient reads a public repository tree and blob contents with Octokit", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/repos/openai/skills")) {
      return createJsonResponse({
        default_branch: "main",
        full_name: "openai/skills",
        private: false,
      });
    }
    if (url.includes("/repos/openai/skills/branches/main")) {
      return createJsonResponse({
        commit: {
          sha: "commit-sha-1",
        },
        name: "main",
      });
    }
    if (url.includes("/repos/openai/skills/git/trees/commit-sha-1")) {
      return createJsonResponse({
        truncated: false,
        tree: [{
          path: "skills/browser/SKILL.md",
          sha: "blob-skill",
          type: "blob",
        }, {
          path: "skills/browser/scripts/open.sh",
          sha: "blob-script",
          type: "blob",
        }],
      });
    }
    if (url.includes("/repos/openai/skills/git/blobs/blob-skill")) {
      return createJsonResponse({
        content: Buffer.from("---\ndescription: Browser automation guidance\n---\n\nRead SKILL.md first.\n").toString("base64"),
        encoding: "base64",
      });
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };
  const client = new SkillGithubPublicClient({
    fetchImpl,
  });

  const repositoryTree = await client.getRepositoryTree("https://github.com/openai/skills");
  const blobContent = await client.readBlob("openai/skills", "blob-skill");

  assert.deepEqual(repositoryTree, {
    branchName: "main",
    commitSha: "commit-sha-1",
    repository: "openai/skills",
    treeEntries: [{
      path: "skills/browser/scripts/open.sh",
      sha: "blob-script",
      type: "blob",
    }, {
      path: "skills/browser/SKILL.md",
      sha: "blob-skill",
      type: "blob",
    }],
  });
  assert.equal(blobContent, "---\ndescription: Browser automation guidance\n---\n\nRead SKILL.md first.\n");
});

test("SkillGithubPublicClient rejects private repositories", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/repos/openai/private-skills")) {
      return createJsonResponse({
        default_branch: "main",
        full_name: "openai/private-skills",
        private: true,
      });
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };
  const client = new SkillGithubPublicClient({
    fetchImpl,
  });

  await assert.rejects(async () => {
    await client.getRepositoryTree("https://github.com/openai/private-skills");
  }, /Only public GitHub repositories are supported/);
});
