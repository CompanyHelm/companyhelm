import { generateKeyPairSync } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GithubClient } from "../src/github/client.ts";

const TEST_PRIVATE_KEY_PEM = (() => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs1", format: "pem" }).toString();
})();

function createGithubClient(fetchImpl: typeof fetch): GithubClient {
  return new GithubClient({
    github: {
      app_client_id: "Iv-test-local",
      app_client_secret: "github-test-secret",
      app_link: "https://github.com/apps/companyhelm-test",
      app_private_key_pem: TEST_PRIVATE_KEY_PEM,
    },
  } as Config, {
    fetchImpl,
  });
}

function createJsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });
}

test("GithubClient validates installation ids", () => {
  assert.equal(GithubClient.validateInstallationId("110600868"), 110600868);
  assert.equal(GithubClient.validateInstallationId(110600868), 110600868);
  assert.equal(GithubClient.validateInstallationId(110600868n), 110600868);
  assert.throws(
    () => GithubClient.validateInstallationId("abc"),
    /installationId must be a positive integer\./,
  );
});

test("GithubClient parses GitHub installation callback search params", () => {
  assert.deepEqual(
    GithubClient.parseAuthorizationCallback(
      "installation_id=110600868&setup_action=install&code=abc123&state=company-1",
    ),
    {
      installationId: 110600868,
      setupAction: "install",
      authorizationCode: "abc123",
      state: "company-1",
    },
  );
});

test("GithubClient generates a GitHub App JWT with the expected claims", () => {
  const result = GithubClient.generateAppJwt({
    clientId: "Iv-test-local",
    privateKeyPem: TEST_PRIVATE_KEY_PEM,
  });
  const [, payloadRaw] = result.token.split(".");
  const payload = JSON.parse(Buffer.from(payloadRaw, "base64url").toString("utf8")) as {
    iss: string;
    iat: number;
    exp: number;
  };

  assert.equal(payload.iss, "Iv-test-local");
  assert.ok(payload.iat < payload.exp);
  assert.ok(payload.exp - payload.iat >= 540);
});

test("GithubClient lists discovered skill directories from a repository tree", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/access_tokens")) {
      return createJsonResponse({
        expires_at: "2030-01-01T00:00:00Z",
        token: "installation-token",
      });
    }
    if (url.includes("/git/trees/")) {
      return createJsonResponse({
        truncated: false,
        tree: [{
          path: "skills/browser/SKILL.md",
          sha: "sha-browser-skill",
          type: "blob",
        }, {
          path: "skills/browser/scripts/open.sh",
          sha: "sha-browser-open",
          type: "blob",
        }, {
          path: "skills/browser/nested/SKILL.md",
          sha: "sha-nested-skill",
          type: "blob",
        }, {
          path: "skills/browser/nested/tool.sh",
          sha: "sha-nested-tool",
          type: "blob",
        }],
      });
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };
  const client = createGithubClient(fetchImpl);

  const directories = await client.listSkillDirectories({
    defaultBranch: "main",
    installationId: 110600868,
    repositoryFullName: "companyhelm/skills",
  });

  assert.deepEqual(directories, [{
    fileList: ["scripts/open.sh"],
    name: "Browser",
    path: "skills/browser",
  }, {
    fileList: ["tool.sh"],
    name: "Nested",
    path: "skills/browser/nested",
  }]);
});

test("GithubClient reads a skill package and derives metadata from SKILL.md", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/access_tokens")) {
      return createJsonResponse({
        expires_at: "2030-01-01T00:00:00Z",
        token: "installation-token",
      });
    }
    if (url.includes("/git/trees/")) {
      return createJsonResponse({
        truncated: false,
        tree: [{
          path: "skills/browser/SKILL.md",
          sha: "sha-browser-skill",
          type: "blob",
        }, {
          path: "skills/browser/scripts/open.sh",
          sha: "sha-browser-open",
          type: "blob",
        }],
      });
    }
    if (url.includes("/git/blobs/sha-browser-skill")) {
      return createJsonResponse({
        content: Buffer.from("# Browser automation\n\nUse the browser helpers first.\n").toString("base64"),
        encoding: "base64",
      });
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };
  const client = createGithubClient(fetchImpl);

  const skillPackage = await client.getSkillPackage({
    defaultBranch: "main",
    installationId: 110600868,
    repositoryFullName: "companyhelm/skills",
    skillDirectory: "skills/browser",
  });

  assert.deepEqual(skillPackage, {
    branchName: "main",
    description: "Use the browser helpers first.",
    fileList: ["scripts/open.sh"],
    instructions: "# Browser automation\n\nUse the browser helpers first.\n",
    name: "Browser automation",
    path: "skills/browser",
    repositoryFullName: "companyhelm/skills",
  });
});
