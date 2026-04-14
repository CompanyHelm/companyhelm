import "reflect-metadata";
import assert from "node:assert/strict";
import { Container } from "inversify";
import { test } from "vitest";
import { Config } from "../src/config/schema.ts";
import { SkillGithubPublicClient } from "../src/services/skills/github/public_client.ts";
import { SkillGithubRepositoryReference } from "../src/services/skills/github/repository_reference.ts";

const TEST_GITHUB_PUBLIC_TOKEN = "ghp_test_public_repository_token";

function createConfigMock(): Config {
  return {
    github: {
      public_repository_token: TEST_GITHUB_PUBLIC_TOKEN,
    },
  } as Config;
}

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
  const fetchImpl: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    const url = request.url;
    assert.equal(
      request.headers.get("authorization"),
      `token ${TEST_GITHUB_PUBLIC_TOKEN}`,
    );
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
  const client = new SkillGithubPublicClient(createConfigMock(), {
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
  const client = new SkillGithubPublicClient({} as Config, {
    fetchImpl,
  });

  await assert.rejects(async () => {
    await client.getRepositoryTree("https://github.com/openai/private-skills");
  }, /Only public GitHub repositories are supported/);
});

test("SkillGithubPublicClient fails fast and returns a quota error without retrying", async () => {
  let requestCount = 0;
  const fetchImpl: typeof fetch = async (input) => {
    requestCount += 1;
    const url = String(input);
    if (url.endsWith("/repos/openai/skills")) {
      return createJsonResponse({
        documentation_url: "https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api",
        message: "API rate limit exceeded for 127.0.0.1.",
      }, 403);
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };
  const client = new SkillGithubPublicClient({} as Config, {
    fetchImpl,
  });

  await assert.rejects(async () => {
    await client.getRepositoryTree("https://github.com/openai/skills");
  }, /GitHub API request quota is exhausted while trying to read the GitHub repository/);
  assert.equal(requestCount, 1);
});

test("SkillGithubPublicClient returns generic GitHub API failures as user-facing errors", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/repos/openai/skills")) {
      return createJsonResponse({
        message: "GitHub service unavailable",
      }, 500);
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };
  const client = new SkillGithubPublicClient(createConfigMock(), {
    fetchImpl,
  });

  await assert.rejects(async () => {
    await client.getRepositoryTree("https://github.com/openai/skills");
  }, /GitHub request failed while trying to read the GitHub repository: GitHub service unavailable/);
});

test("SkillGithubPublicClient turns timed out GitHub requests into user-facing errors", async () => {
  const fetchImpl: typeof fetch = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(init.signal?.reason ?? new Error("Aborted."));
      }, { once: true });
    });
  const client = new SkillGithubPublicClient({} as Config, {
    fetchImpl,
    requestTimeoutMs: 10,
  });

  await assert.rejects(async () => {
    await client.getRepositoryTree("https://github.com/openai/skills");
  }, /GitHub request timed out while trying to read the GitHub repository/);
});

test("SkillGithubPublicClient resolved through DI uses the configured GitHub client credentials", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    assert.equal(
      request.headers.get("authorization"),
      `token ${TEST_GITHUB_PUBLIC_TOKEN}`,
    );
    if (request.url.endsWith("/repos/openai/skills")) {
      return createJsonResponse({
        default_branch: "main",
        full_name: "openai/skills",
        private: false,
      });
    }
    if (request.url.includes("/repos/openai/skills/branches?")) {
      return createJsonResponse([{
        commit: {
          sha: "commit-sha-main",
        },
        name: "main",
      }]);
    }

    throw new Error(`Unexpected GitHub request: ${request.url}`);
  };

  try {
    const container = new Container({
      autobind: true,
      defaultScope: "Singleton",
    });
    container.bind(Config).toConstantValue(createConfigMock());

    const client = container.get(SkillGithubPublicClient);
    const branches = await client.getRepositoryBranches("https://github.com/openai/skills");

    assert.deepEqual(branches, {
      branches: [{
        commitSha: "commit-sha-main",
        isDefault: true,
        name: "main",
      }],
      repository: "openai/skills",
    });
  } finally {
    global.fetch = originalFetch;
  }
});
